class AddGameStatusToGame < ActiveRecord::Migration[5.0]
  def change
    add_column :games, :status, :integer, default: 0
    add_column :games, :winner, :integer, default: nil
  end
end
