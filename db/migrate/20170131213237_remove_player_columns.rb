class RemovePlayerColumns < ActiveRecord::Migration[5.0]
  def change
    remove_column :players, :last_action
    remove_column :players, :last_action_time
    remove_column :players, :last_state
  end
end
