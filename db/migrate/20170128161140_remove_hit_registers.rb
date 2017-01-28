class RemoveHitRegisters < ActiveRecord::Migration[5.0]
  def change
    drop_table :hit_registers
  end
end
