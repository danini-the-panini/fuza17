module ApplicationHelper
  def page_class
    if game_page?
      'page-game-show'
    elsif devise_controller?
      'devise-page'
    end
  end

  def game_page?
    params[:controller] == 'games' && params[:action] == 'show'
  end
end
