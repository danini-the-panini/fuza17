class RemoveColumnsFromGames < ActiveRecord::Migration[5.0]
  def change
    remove_column :games, :state
  end
end
