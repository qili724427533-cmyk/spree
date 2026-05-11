module Spree
  module Api
    module V3
      class ChannelSerializer < BaseSerializer
        typelize name: :string,
                 code: :string,
                 active: :boolean

        attributes :name, :code, :active
      end
    end
  end
end
