class AddUniqueConstraintToPlayers < ActiveRecord::Migration[5.0]
  def change
    add_index :players, [:user_id, :game_id], :unique => true
  end
end
