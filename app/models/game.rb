class Game < ApplicationRecord
  MONUMENT_HP = 1000.0

  belongs_to :user
  has_many :players, dependent: :destroy

  enum status: [:in_progress, :over ]

  validates :name, presence: true, uniqueness: true

  def self.default_state
    {
      monument_hps: [MONUMENT_HP, MONUMENT_HP]
    }
  end
end
