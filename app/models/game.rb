class Game < ApplicationRecord
  belongs_to :user
  has_many :players, dependent: :destroy
  has_many :hit_registers, dependent: :destroy

  validates :name, presence: true, uniqueness: true
end
