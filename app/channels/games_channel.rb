class GamesChannel < ApplicationCable::Channel
  def subscribed
    stream_from "games_#{params['game_id']}_channel"
    ActionCable.server.broadcast "games_#{params['game_id']}_channel",
                                 message: "#{current_user.name} joined the game"
  end

  def unsubscribed
    ActionCable.server.broadcast "games_#{params['game_id']}_channel",
                                 message: "#{current_user.name} left the game"
  end

  def do_a_thing(data)
    ActionCable.server.broadcast "games_#{data['game_id']}_channel",
                                 message: "#{current_user.name} did a thing"
  end
end
