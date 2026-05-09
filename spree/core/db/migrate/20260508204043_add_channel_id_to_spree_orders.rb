class AddChannelIdToSpreeOrders < ActiveRecord::Migration[7.2]
  def change
    remove_column :spree_orders, :channel, :string, default: 'spree'
    add_reference :spree_orders, :channel
  end
end
