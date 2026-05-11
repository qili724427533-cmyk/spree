namespace :spree do
  namespace :channels do
    desc 'Create a default channel for every store that does not already have one'
    task create_defaults: :environment do
      created = 0
      Spree::Store.find_each do |store|
        next if store.channels.exists?

        # The Channel after_create hook seeds the three default routing
        # rules (PreferredLocation, MinimizeSplits, DefaultLocation) so
        # this single create! covers both the channel and its rules.
        store.channels.create!(name: 'Online Store', code: Spree::Channel::DEFAULT_CODE)
        created += 1
        puts "  Store '#{store.name}': created default channel '#{Spree::Channel::DEFAULT_CODE}'"
      end

      puts created.zero? ? '  All stores already have at least one channel.' : "  Created #{created} default channel(s)."
    end

    desc 'Backfill spree_orders.channel_id from the legacy spree_orders.channel string column'
    task backfill_order_channel_ids: :environment do
      # Idempotent: only touches orders where channel_id is nil. Safe to
      # re-run after partial completion. Returns gracefully if the legacy
      # string column has already been dropped.
      unless legacy_channel_column?
        puts 'Legacy channel column not present — backfill is unnecessary.'
        next
      end

      Spree::Store.find_each do |store|
        legacy_codes = Spree::Order.where(store_id: store.id, channel_id: nil)
                                   .distinct
                                   .pluck(Arel.sql('channel'))
                                   .compact_blank

        codes_to_process = legacy_codes.uniq
        codes_to_process << Spree::Channel::DEFAULT_CODE unless codes_to_process.include?(Spree::Channel::DEFAULT_CODE)

        codes_to_process.each do |code|
          channel = store.channels.find_or_create_by!(code: code) do |c|
            c.name = code.titleize
          end

          scope = Spree::Order.where(store_id: store.id, channel_id: nil)
          scope = if code == Spree::Channel::DEFAULT_CODE
                    # Only the default channel claims NULL/blank rows.
                    scope.where(Arel.sql("channel = ? OR channel IS NULL OR channel = ''"), code)
                  else
                    scope.where(Arel.sql('channel = ?'), code)
                  end

          updated = scope.update_all(channel_id: channel.id)

          next if updated.zero?

          puts "  Store '#{store.name}': mapped #{updated} orders with channel='#{code}' → #{channel.name} (#{channel.code})"
        end
      end
    end

    desc 'Run the full 5.4 → 5.5 channel upgrade: create defaults, then backfill order channels'
    task upgrade: %i[create_defaults backfill_order_channel_ids]

    def legacy_channel_column?
      ActiveRecord::Base.connection.column_exists?(:spree_orders, :channel)
    end
  end
end
