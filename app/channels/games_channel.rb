class GamesChannel < ApplicationCable::Channel
  def subscribed
    game = find_game

    stream_from channel_name
    stream_from user_channel_name

    sleep 0.1

    team_index = get_team_index

    spawn_x, spawn_y = map.spawn_point(team_index)

    time = Time.now
    initial_state = {
      x: spawn_x,
      y: spawn_y,
      hp: 100.0,
      kills: 0,
      deaths: 0,
      team: team_index,
      abilities: [
        {
          cooldown: 0.5,
          type: 'target',
          range: 10.0,
          last_hit: time.to_f,
          damage: 10.0
        },
        {
          cooldown: 0.5,
          type: 'point',
          range: 20.0,
          last_hit: time.to_f,
          damage: 20.0,
          radius: 2.0
        },
        {
          cooldown: 0.5, # TODO: make this like 10s
          type: 'direction',
          range: 100.0,
          last_hit: time.to_f,
          damage: 40.0
        }
      ]
    }

    player = if game.in_progress?
      game.players.find_or_create_by(user_id: current_user.id) do |p|
        p.state = initial_state
        p.team = team_index

        ActionCable.server.broadcast channel_name,
                                     type: 'player_joined',
                                     player: {
                                       id: current_user.id,
                                       name: current_user.name,
                                       time: time.to_f,
                                       state: p.state
                                     }
      end
    else
      game.players.find_by(user_id: current_user.id)
    end

    return if player.nil?

    ActionCable.server.broadcast user_channel_name,
                                 type: 'player_setup',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name,
                                   time: time.to_f,
                                   state: player.state
                                 },
                                 game_state: game.state,
                                 game_over: game.over?,
                                 winner: game.winner

    players = game.players.where.not(user_id: current_user.id).map do |p|
      {
        id: p.user.id,
        name: p.user.name,
        state: p.state,
        action: p.last_action,
        time: p.last_action_time.to_f
      }
    end

    ActionCable.server.broadcast user_channel_name,
                                 type: 'other_players',
                                 players: players

    player.save_redis_attributes
  end

  def unsubscribed
    game = find_game
    player = game.players.find_by(user: current_user)
    return if player.nil?

    ActionCable.server.broadcast channel_name,
                                 type: 'player_finished_moving',
                                 player: {
                                   id: player.user_id,
                                   name: player.user.name,
                                   state: player.state,
                                   time: Time.now.to_f
                                 },
                                 position: { x: player.state['x'], y: player.state['y'] }
  end

  def player_started_moving(action)
    game = find_game
    return unless game.in_progress?
    player = game.players.find_by(user: current_user)
    time = Time.now
    state = player.state

    return if state['dead'  ]
    return unless map.can_traverse?(action['point']['x'], action['point']['y'])
    state['x'] = action['position']['x']
    state['y'] = action['position']['y']

    ActionCable.server.broadcast channel_name,
                             type: 'player_started_moving',
                             player: {
                               id: current_user.id,
                               name: current_user.name,
                               state: state,
                               time: time.to_f
                             },
                             position: action['position'],
                             point: action['point']

    player.last_action = action
    player.last_action_time = time
    player.state = state
    player.save_redis_attributes
  end

  def player_finished_moving(action)
    game = find_game
    return unless game.in_progress?
    player = game.players.find_by(user: current_user)
    time = Time.now
    state = player.state

    return if state['dead']
    state['x'] = action['position']['x']
    state['y'] = action['position']['y']

    ActionCable.server.broadcast channel_name,
                             type: 'player_finished_moving',
                             player: {
                               id: current_user.id,
                               name: current_user.name,
                               state: state,
                               time: time.to_f
                             },
                             position: action['position']

    player.last_action = action
    player.last_action_time = time
    player.state = state
    player.save_redis_attributes
  end

  def target_player(action)
    perform_attack(action)
  end

  def fire_grenade(action)
    perform_attack(action)
  end

  def fire_missile(action)
    perform_attack(action)
  end

  def target_monument(action)
    perform_attack(action)
  end

  def player_hit(action)
    game = find_game
    return unless game.in_progress?
    time = Time.now

    hit_id = action['hit_id']

    hit = game.find_hit(hit_id)
    return if hit.nil?
    source_player = game.players.find_by(user_id: hit['source_id'])
    game.destroy_hit(hit_id)

    target_player = game.players.find_by(user_id: action['player_id'])
    damage_player(target_player, action['damage'], source_player, action, time)

    target_player.save_redis_attributes

    source_player.last_action = nil
    source_player.last_action_time = nil
    source_player.save_redis_attributes
  end

  def splash_damage(action)
    game = find_game
    return unless game.in_progress?
    time = Time.now

    hit_id = action['hit_id']

    hit = game.find_hit(hit_id)
    return if hit.nil?
    source_player = game.players.find_by(user_id: hit['source_id'])
    game.destroy_hit(hit_id)

    target_players = action['players_affected'].map { |(target_id, damage_done)|
      [game.players.find_by(user_id: target_id), damage_done]
    }.select { |(tp, damage_done)|
      damage_player(tp, damage_done, source_player, action, time, rebroadcast: false)
    }

    ActionCable.server.broadcast channel_name,
                                 type: 'splash_damage',
                                 player: {
                                   id: source_player.user_id,
                                   name: source_player.user.name,
                                   state: source_player.state,
                                   time: time.to_f
                                 },
                                 hit_id: hit_id,
                                 players_affected: target_players.map { |(p,_)|
                                   [ p.user_id, p.state['hp'] ]
                                 }.to_h

    if action['monument_damage'] > 0
      damage_monument(1 - source_player.team, action['monument_damage'], source_player, hit_id, time, game)
    end

    target_players.each { |(tp,_)|
      check_player_death(tp, source_player, time)
    }.each { |(tp,_)|
      tp.save_redis_attributes
    }

    source_player.last_action = nil
    source_player.last_action_time = nil
    source_player.save_redis_attributes
    game.save!
    game.save_redis_attributes
  end

  def monument_hit(action)
    game = find_game
    return unless game.in_progress?
    time = Time.now

    monument_id = action['monument_id']

    hit_id = action['hit_id']

    hit = game.find_hit(hit_id)
    return if hit.nil?
    source_player = game.players.find_by(user_id: hit['source_id'])
    game.destroy_hit(hit_id)

    damage_monument(monument_id, action['damage'], source_player, hit_id, time, game)

    source_player.last_action = nil
    source_player.last_action_time = nil
    source_player.save_redis_attributes
    game.save!
    game.save_redis_attributes
  end

  def player_respawn(action)
    game = find_game
    return unless game.in_progress?
    time = Time.now

    target_player = game.players.find_by(user_id: action['player_id'])
    target_state = target_player.state

    return unless target_state['dead']
    return unless time.to_f - target_state['death_time'] >= Player::SPAWN_TIME

    target_state['dead'] = false

    team_index = target_player.team
    spawn_x, spawn_y = map.spawn_point(team_index)

    target_state['x'] = spawn_x
    target_state['y'] = spawn_y

    target_state['hp'] = 100.0

    ActionCable.server.broadcast channel_name,
                                 type: 'player_respawn',
                                 player: {
                                     id: target_player.user_id,
                                     name: target_player.user.name,
                                     state: target_state,
                                     time: time.to_f
                                 }

    target_player.save_redis_attributes
  end

  def leave_game
    game = find_game
    player = game.players.find_by(user: current_user)

    if game.in_progress?
      player.destroy
      ActionCable.server.broadcast channel_name,
                                   type: 'player_left',
                                   player: { id: current_user.id }
    end
  end

  private

  def channel_name
    "games_#{params['game_id']}_channel"
  end

  def user_channel_name
    "games_#{params['game_id']}_user_#{current_user.id}_channel"
  end

  def map
    @_map ||= Map.new(Rails.root.join('app/assets/images/map.png'))
  end

  def find_game
    Game.find params['game_id']
  end

  def get_team_index
    game = find_game
    team_0_count = game.players.where(team: 0).count
    team_1_count = game.players.where(team: 1).count

    if team_0_count < team_1_count
      0
    elsif team_1_count < team_0_count
      1
    else
      rand > 0.5 ? 0 : 1
    end
  end

  def perform_attack(action)
    game = find_game
    return unless game.in_progress?
    player = game.players.find_by(user: current_user)
    time = Time.now
    state = player.state

    return if state['dead']
    state['x'] = action['point']['x']
    state['y'] = action['point']['y']
    ability_index = action['ability_index']
    ability = state['abilities'][ability_index]

    return if time.to_f - ability['last_hit'] < ability['cooldown']

    ability['last_hit']= time.to_f
    action['hit_id'] = SecureRandom.hex(10)

    ActionCable.server.broadcast channel_name,
                                 action.merge(type: action['action'],
                                              player: {
                                                id: current_user.id,
                                                name: current_user.name,
                                                state: state,
                                                time: time.to_f
                                              })

    game.create_hit(action['hit_id'], source_id: current_user.id, ability_index: ability_index)

    player.last_action = action
    player.last_action_time = time
    player.save_redis_attributes
  end

  def damage_player(target_player, damage_done, source_player, action, time, rebroadcast: true)
    target_state = target_player.state
    return false if target_state['dead']
    target_state['hp'] -= damage_done

    if rebroadcast
      ActionCable.server.broadcast channel_name,
                                   type: 'player_hit',
                                   player: {
                                     id: target_player.user_id,
                                     name: target_player.user.name,
                                     state: target_state,
                                     time: time.to_f
                                   },
                                   damage: damage_done,
                                   hit_id: action['hit_id'],
                                   player_id: target_player.user_id

      check_player_death(target_player, source_player, time)
    end

    true
  end

  def check_player_death(target_player, source_player, time)
    target_state = target_player.state

    return false if target_state['dead']

    if target_state['hp'] <= 0.0
      target_state['dead'] = true
      target_state['deaths'] += 1
      target_state['death_time'] = time.to_f

      source_player.state['kills'] += 1

      ActionCable.server.broadcast channel_name,
                                   type: 'player_died',
                                   player: {
                                     id: target_player.user_id,
                                     name: target_player.user.name,
                                     state: target_state,
                                     time: time.to_f
                                   },
                                   spawn_time: Player::SPAWN_TIME,
                                   killer_id: source_player.user_id,
                                   killer_kills: source_player.state['kills']
      return true
    end
    false
  end

  def damage_monument(monument_id, damage_done, source_player, hit_id, time, game)
    game.state['monument_hps'][monument_id] -= damage_done

    ActionCable.server.broadcast channel_name,
                                 type: 'monument_hit',
                                 player: {
                                   id: source_player.user_id,
                                   name: source_player.user.name,
                                   state: source_player.state,
                                   time: time.to_f
                                 },
                                 damage: damage_done,
                                 hit_id: hit_id,
                                 monument_id: monument_id,
                                 game_state: game.state

    if game.state['monument_hps'][monument_id] <= 0
      game.status = :over
      game.winner = 1 - monument_id
      ActionCable.server.broadcast channel_name,
                                   type: 'game_over',
                                   winner: game.winner
    end
  end
end
