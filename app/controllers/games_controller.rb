class GamesController < ApplicationController
  def index
    @games = Game.all
  end

  def show
    @game = Game.find(params[:id])
  end

  def new
    @game = Game.new
  end

  def create
    @game = current_user.games.build(game_params)
    @game.status = :in_progress
    @game.winner = nil
    @game.save!

    @game.state = Game.default_state
    @game.save_redis_attributes

    redirect_to game_path(@game)
  end

  def delete
    current_user.games.find(params[:id]).destroy
  end

  private

  def game_params
    params.require(:game).permit(:name)
  end
end
