class AddStateToGame < ActiveRecord::Migration[5.0]
  def change
    add_column :games, :state, :json
  end
end
