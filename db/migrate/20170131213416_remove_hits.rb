class RemoveHits < ActiveRecord::Migration[5.0]
  def change
    drop_table :hits
  end
end
