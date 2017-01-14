Rails.application.routes.draw do
  devise_for :users

  resources :games, only: %i(new create show index delete)

  root to: 'games#index'
end
