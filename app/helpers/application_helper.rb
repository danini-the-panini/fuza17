module ApplicationHelper
  def page_class
    if current_page?(game_path)
      'page-game-show'
    end
  end
end
