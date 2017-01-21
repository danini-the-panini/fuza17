class CreateHitRegisters < ActiveRecord::Migration[5.0]
  def change
    create_table :hit_registers do |t|
      t.references :game, foreign_key: true
      t.integer :hit_player_id
      t.integer :reporting_player_id
      t.string :hit_identifier

      t.timestamps
    end
  end
end
