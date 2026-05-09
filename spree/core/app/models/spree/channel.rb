module Spree
  # Lightweight distribution surface within a Store: online storefront, POS,
  # marketplace integration, wholesale portal. Channels carry order
  # attribution and the routing-strategy override.
  #
  # 5.5 ships only the Channel model + per-channel order routing. The
  # 6.0-channels-catalogs-b2b plan layers ProductListing, Catalog, B2B
  # Companies, and per-channel API keys on top of this same model.
  class Channel < Spree.base_class
    has_prefix_id :ch

    include Spree::SingleStoreResource
    include Spree::Metafields
    include Spree::Metadata

    # Class name of the Spree::OrderRouting::Strategy::Base subclass for this
    # channel. Empty -> falls back to the Store-level preference.
    preference :order_routing_strategy, :string, default: nil

    belongs_to :store, class_name: 'Spree::Store'

    has_many :orders, class_name: 'Spree::Order', inverse_of: :channel
    has_many :order_routing_rules, class_name: 'Spree::OrderRoutingRule', dependent: :destroy

    attribute :active, :boolean, default: true

    validates :name, presence: true
    validates :code, presence: true, uniqueness: { scope: :store_id }

    scope :active, -> { where(active: true) }

    self.whitelisted_ransackable_attributes = %w[name code active store_id]
  end
end
