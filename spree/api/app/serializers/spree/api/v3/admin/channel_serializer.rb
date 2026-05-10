module Spree
  module Api
    module V3
      module Admin
        class ChannelSerializer < V3::ChannelSerializer
          typelize store_id: :string,
                   preferred_order_routing_strategy: [:string, nullable: true]

          attributes :preferred_order_routing_strategy,
                     created_at: :iso8601, updated_at: :iso8601

          attribute :store_id do |channel|
            channel.store&.prefixed_id
          end
        end
      end
    end
  end
end
