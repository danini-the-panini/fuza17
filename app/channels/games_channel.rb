class GamesChannel < ApplicationCable::Channel
  def subscribed
    stream_from channel_name
    stream_from user_channel_name

    sleep 0.1

    time = Time.now
    intial_state = {
      x: (rand * 20.0) - 10.0,
      y: (rand * 20.0) - 10.0,
      cooldowns: [
        0.5
      ],
      last_hits: [
        time.to_f
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

  def send_action(data)
    player = game.players.find_by(user: current_user)
    time = Time.now

    action = data['player_action']
    state = data['state']

    puts state
    puts player.last_state

    if action['type'] == 'target_player'
      ability_index = action['ability_index']
      if time.to_f - player.last_state['last_hits'][ability_index] < player.last_state['cooldowns'][ability_index]
        return
      else
        state['last_hits'][ability_index] = time.to_f
      end
    end

    player.update(last_action: action, last_action_time: time, last_state: state)

    ActionCable.server.broadcast channel_name,
                                 type: 'player_action',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name,
                                   state: state,
                                   time: time.to_f
                                 },
                                 action: action
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
end
