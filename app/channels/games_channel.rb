class GamesChannel < ApplicationCable::Channel
  def subscribed
    stream_from "games_#{params['game_id']}_channel"
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end

  def do_a_thing(data)
    ActionCable.server.broadcast "games_#{data['game_id']}_channel",
                                 message: "#{current_user.name} did a thing"
  end
end
