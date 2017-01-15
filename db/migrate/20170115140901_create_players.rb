class CreatePlayers < ActiveRecord::Migration[5.0]
  def change
    create_table :players do |t|
      t.references :user, foreign_key: true
      t.references :game, foreign_key: true
      t.json :last_action
      t.datetime :last_action_time
      t.json :last_state

      t.timestamps
    end
  end
end
