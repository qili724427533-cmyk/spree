class CreateSpreeChannels < ActiveRecord::Migration[7.2]
  def change
    create_table :spree_channels do |t|
      t.references :store, null: false
      t.string :name, null: false
      t.string :code, null: false
      t.boolean :active, null: false
      t.text :preferences
      t.timestamps
    end

    add_index :spree_channels, [:store_id, :code], unique: true
  end
end
