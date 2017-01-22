class CreateHits < ActiveRecord::Migration[5.0]
  def change
    create_table :hits do |t|
      t.string :hit_identifier
      t.integer :source_id
      t.integer :ability_index

      t.timestamps
    end
  end
end
