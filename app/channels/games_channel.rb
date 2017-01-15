class GamesChannel < ApplicationCable::Channel
  def subscribed
    stream_from "games_#{params['game_id']}_channel"
    ActionCable.server.broadcast channel_name,
                                 message: "#{current_user.name} joined the game",
                                 type: 'player_joined',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name
                                 }
  end

  def unsubscribed
    ActionCable.server.broadcast channel_name,
                                 message: "#{current_user.name} left the game",
                                 type: 'player_left',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name
                                 }
  end

  def send_action(data)
    action = data['player_action']
    ActionCable.server.broadcast channel_name,
                                 message: "#{current_user.name} did a thing",
                                 type: 'player_action',
                                 player: {
                                   id: current_user.id,
                                   name: current_user.name
                                 },
                                 action: action
  end

  private

  def channel_name
    "games_#{params['game_id']}_channel"
  end
end
