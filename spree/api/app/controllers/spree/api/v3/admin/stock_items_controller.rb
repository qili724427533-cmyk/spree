module Spree
  module Api
    module V3
      module Admin
        # Stock items are auto-created when a variant lands at a stock
        # location, so there's deliberately no `create` route — use the
        # variants / stock-locations endpoints for that flow.
        class StockItemsController < ResourceController
          scoped_resource :settings

          protected

          def model_class
            Spree::StockItem
          end

          def serializer_class
            Spree.api.admin_stock_item_serializer
          end

          def collection_includes
            [:stock_location, :variant]
          end
        end
      end
    end
  end
end
