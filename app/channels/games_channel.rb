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
        }
      ]
    }

    player = if game.in_progress?
      game.players.find_or_create_by(user_id: current_user.id) do |p|
        p.last_state = initial_state
        p.team = team_index

        ActionCable.server.broadcast channel_name,
                                     type: 'player_joined',
                                     player: {
                                       id: current_user.id,
                                       name: current_user.name,
                                       time: time.to_f,
                                       state: p.last_state
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
                                   state: player.last_state
                                 },
                                 game_state: game.state,
                                 game_over: game.over?,
                                 winner: game.winner

    players = game.players.where.not(user_id: current_user.id).map do |p|
      {
        id: p.user.id,
        name: p.user.name,
        state: p.last_state,
        action: p.last_action,
        time: p.last_action_time.to_f
      }
    end

    ActionCable.server.broadcast user_channel_name,
                                 type: 'other_players',
                                 players: players
  end

  def unsubscribed
    game = find_game
    player = game.players.find_by(user: current_user)
    return if player.nil?

    ActionCable.server.broadcast channel_name,
                                 type: 'player_action',
                                 player: {
                                   id: player.user_id,
                                   name: player.user.name,
                                   state: player.last_state,
                                   time: Time.now.to_f
                                 },
                                 action: {
                                   type: 'player_finished_moving',
                                   position: { x: player.last_state['x'], y: player.last_state['y'] }
                                 }
  end

  def send_action(action)
    game = find_game

    return unless game.in_progress?

    player = game.players.find_by(user: current_user)
    time = Time.now

    state = player.last_state

    save_action = false

    case action['type']
    when 'player_started_moving'
      return if state['dead']
      return unless map.can_traverse?(action['point']['x'], action['point']['y'])
      state['x'] = action['position']['x']
      state['y'] = action['position']['y']
      save_action = true
    when 'player_finished_moving'
      return if state['dead']
      state['x'] = action['position']['x']
      state['y'] = action['position']['y']
      save_action = true
    when 'target_player', 'target_monument'
      return if state['dead']
      state['x'] = action['point']['x']
      state['y'] = action['point']['y']
      ability_index = action['ability_index']
      ability = state['abilities'][ability_index]
      if time.to_f - ability['last_hit'] < ability['cooldown']
        return
      else
        state['abilities'][ability_index]['last_hit'] = time.to_f
        action['hit_id'] = SecureRandom.hex(10)

        Hit.create(source_id: current_user.id, hit_identifier: action['hit_id'], ability_index: ability_index)
      end
      save_action = true
    when 'player_hit'
      target_player = game.players.find_by(user_id: action['player_id'])
      target_state = target_player.last_state

      hit_id = action['hit_id']

      hit = Hit.find_by(hit_identifier: hit_id)
      return if hit.nil?
      source_player = game.players.find_by(user_id: hit.source_id)
      hit.destroy

      target_state['hp'] -= action['damage']

      ActionCable.server.broadcast channel_name,
                                   type: 'player_action',
                                   player: {
                                     id: target_player.user_id,
                                     name: target_player.user.name,
                                     state: target_state,
                                     time: time.to_f
                                   },
                                   action: action

      if target_state['hp'] <= 0.0
        target_state['dead'] = true
        target_state['deaths'] += 1
        target_state['death_time'] = time.to_f

        killer = Player.find_by(user_id: hit.source_id)
        killer_state = killer.last_state
        killer_state['kills'] += 1

        ActionCable.server.broadcast channel_name,
                                     type: 'player_action',
                                     player: {
                                       id: target_player.user_id,
                                       name: target_player.user.name,
                                       state: target_state,
                                       time: time.to_f
                                     },
                                     action: {
                                       type: 'player_died',
                                       spawn_time: Player::SPAWN_TIME,
                                       killer_id: hit.source_id,
                                       killer_kills: killer_state['kills']
                                     }
        killer.update(last_state: killer_state)
      end

      target_player.update(last_state: target_state)
      source_player.update(last_action: nil)
      return
    when 'monument_hit'
      monument_id = action['monument_id']

      hit_id = action['hit_id']

      hit = Hit.find_by(hit_identifier: hit_id)
      return if hit.nil?
      source_player = game.players.find_by(user_id: hit.source_id)
      hit.destroy

      game.state['monument_hps'][monument_id] -= action['damage']

      ActionCable.server.broadcast channel_name,
                                   type: 'player_action',
                                   player: {
                                     id: source_player.user_id,
                                     name: source_player.user.name,
                                     state: source_player.last_state,
                                     time: time.to_f
                                   },
                                   action: action,
                                   game_state: game.state

      if game.state['monument_hps'][monument_id] <= 0
        game.status = :over
        game.winner = 1 - monument_id
        ActionCable.server.broadcast channel_name,
                                     type: 'game_over',
                                     winner: game.winner
      end

      source_player.update(last_action: nil)
      game.save!
      return
    when 'player_respawn'
      target_player = game.players.find_by(user_id: action['player_id'])
      target_state = target_player.last_state

      return unless target_state['dead']
      return unless time.to_f - target_state['death_time'] >= Player::SPAWN_TIME

      target_state['dead'] = false

      team_index = target_player.team
      spawn_x, spawn_y = map.spawn_point(team_index)

      target_state['x'] = spawn_x
      target_state['y'] = spawn_y

      target_state['hp'] = 100.0

      ActionCable.server.broadcast channel_name,
                                   type: 'player_action',
                                   player: {
                                       id: target_player.user_id,
                                       name: target_player.user.name,
                                       state: target_state,
                                       time: time.to_f
                                   },
                                   action: {
                                     type: 'player_respawn'
                                   }

      target_player.update(last_state: target_state)
      return
    else
    end

    ActionCable.server.broadcast channel_name,
                                 type: 'player_action',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name,
                                   state: state,
                                   time: time.to_f
                                 },
                                 action: action

    savable_action = save_action ? action : nil

    player.update(last_action: savable_action, last_action_time: time, last_state: state)
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
end
