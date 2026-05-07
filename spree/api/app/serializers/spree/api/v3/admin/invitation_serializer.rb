module Spree
  module Api
    module V3
      module Admin
        # Admin API serializer for {Spree::Invitation}. Used on the staff
        # settings page to list pending invitations and to surface the result
        # of `POST /admin/invitations`. Inviter and invitee are flattened to
        # email-only — the full polymorphic identities aren't useful to the UI.
        class InvitationSerializer < V3::BaseSerializer
          typelize email: :string,
                   status: :string,
                   role_id: [:string, nullable: true],
                   role_name: [:string, nullable: true],
                   inviter_email: [:string, nullable: true],
                   expires_at: [:string, nullable: true],
                   acceptance_url: :string

          attributes :email, :status,
                     created_at: :iso8601, updated_at: :iso8601, expires_at: :iso8601

          attribute :role_id do |invitation|
            invitation.role&.prefixed_id
          end

          attribute :role_name do |invitation|
            invitation.role&.name
          end

          attribute :inviter_email do |invitation|
            invitation.inviter&.email
          end

          # Absolute URL when `Spree::Config[:admin_url]` is set, otherwise
          # the path so the SPA can prepend `window.location.origin`.
          attribute :acceptance_url do |invitation|
            if Spree::Config[:admin_url].present?
              Rails.application.routes.url_helpers.admin_invitation_acceptance_url(invitation)
            else
              "/accept-invitation/#{invitation.prefixed_id}?token=#{invitation.token}"
            end
          end
        end
      end
    end
  end
end
