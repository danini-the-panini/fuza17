class GamesChannel < ApplicationCable::Channel
  def subscribed
    stream_from channel_name
    stream_from user_channel_name

    sleep 0.1

    team_index = rand > 0.5 ? 0 : 1

    spawn_x, spawn_y = map.spawn_point(team_index)

    time = Time.now
    intial_state = {
      x: spawn_x,
      y: spawn_y,
      hp: 100.0,
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

    ActionCable.server.broadcast channel_name,
                                 type: 'player_joined',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name,
                                   time: time.to_f,
                                   state: intial_state
                                 }


    ActionCable.server.broadcast user_channel_name,
                                 type: 'player_setup',
                                 player: {
                                   time: time.to_f,
                                   state: intial_state
                                 }

    players = game.players.map do |p|
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

    game.players.create(user: current_user, last_state: intial_state)
  end

  def unsubscribed
    player = game.players.find_by(user: current_user)
    player.destroy

    ActionCable.server.broadcast channel_name,
                                 type: 'player_left',
                                 player: { id: current_user.id }
  end

  def send_action(action)
    player = game.players.find_by(user: current_user)
    time = Time.now

    state = player.last_state

    case action['type']
    when 'player_started_moving'
      return unless map.can_traverse?(action['point']['x'], action['point']['y'])
      state['x'] = action['position']['x']
      state['y'] = action['position']['y']
    when 'player_finished_moving'
      state['x'] = action['position']['x']
      state['y'] = action['position']['y']
    when 'target_player'
      state['x'] = action['point']['x']
      state['y'] = action['point']['y']
      ability_index = action['ability_index']
      ability = state['abilities'][ability_index]
      if time.to_f - ability['last_hit'] < ability['cooldown']
        return
      else
        state['abilities'][ability_index]['last_hit'] = time.to_f
        action['hit_id'] = SecureRandom.hex(10)
      end
    when 'player_hit'
      target_player = game.players.find_by(user_id: action['player_id'])
      target_state = target_player.last_state

      consensus_agreement = (game.players.count * 0.75).ceil

      hit_id = action['hit_id']
      game.hit_registers.find_or_create_by(hit_player_id: target_player.user_id,
                                           reporting_player_id: current_user.id,
                                           hit_identifier: hit_id)

      hit_count = game.hit_registers.where(hit_player_id: target_player.user_id,
                                            hit_identifier: hit_id).count

      if hit_count < consensus_agreement
        target_player.update(last_state: target_state)
        return
      end
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

      target_player.update(last_state: target_state)

      game.hit_registers.where(hit_player_id: target_player.user_id,
                                            hit_identifier: hit_id).destroy_all
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

    player.update(last_action: action, last_action_time: time, last_state: state)
  end

  private

  def channel_name
    "games_#{params['game_id']}_channel"
  end

  def user_channel_name
    "games_#{params['game_id']}_user_#{current_user.id}_channel"
  end

  def game
    Game.find params['game_id']
  end

  def map
    @_map ||= Map.new(Rails.root.join('app/assets/images/map.png'))
  end
end
