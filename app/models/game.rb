class Game < ApplicationRecord
  belongs_to :user
  has_many :players, dependent: :destroy

  validates :name, presence: true, uniqueness: true
end
