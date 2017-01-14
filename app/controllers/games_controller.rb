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
    @game = current_user.games.create(game_params)
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
