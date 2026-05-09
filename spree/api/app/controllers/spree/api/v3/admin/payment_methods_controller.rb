module Spree
  module Api
    module V3
      module Admin
        class PaymentMethodsController < ResourceController
          scoped_resource :settings

          def create
            klass = resolve_subclass(permitted_params[:type])
            return render_unknown_type unless klass

            @resource = klass.new(permitted_params.except(:type))
            @resource.stores = [current_store] if @resource.stores.empty?
            authorize_resource!(@resource, :create)

            if @resource.save
              render json: serialize_resource(@resource), status: :created
            else
              render_validation_error(@resource.errors)
            end
          end

          # Lists available payment provider subclasses for the create form.
          # Returns a stable shape: { type, label, description }.
          def types
            authorize! :create, model_class

            providers = Spree::PaymentMethod.providers.map do |klass|
              {
                type: klass.to_s,
                label: klass.respond_to?(:model_name) ? klass.model_name.human : klass.to_s.demodulize,
                description: klass.respond_to?(:description) ? klass.description : nil
              }
            end

            render json: { data: providers.sort_by { |p| p[:label] } }
          end

          protected

          def model_class
            Spree::PaymentMethod
          end

          def serializer_class
            Spree.api.admin_payment_method_serializer
          end

          private

          # Looks up `type` against `Spree::PaymentMethod.providers` (the
          # registered allowlist) so callers can't constantize arbitrary
          # classes. Returns `Spree::PaymentMethod` itself when type is blank
          # so the model layer can surface its own validation error.
          def resolve_subclass(type_name)
            return Spree::PaymentMethod if type_name.blank?

            Spree::PaymentMethod.providers.find { |klass| klass.to_s == type_name }
          end

          def render_unknown_type
            render_error(
              code: 'unknown_payment_method_type',
              message: Spree.t(:invalid_payment_method_type, scope: :api, default: 'Unknown payment method type'),
              status: :unprocessable_content
            )
          end
        end
      end
    end
  end
end
