class Player < ApplicationRecord
  belongs_to :user
  belongs_to :game

  SPAWN_TIME = 5.0
end
