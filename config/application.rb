require_relative 'boot'

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Fuza17
  class Application < Rails::Application
    config.browserify_rails.commandline_options = '-t [ babelify --presets [ es2015 stage-1 ] ]'
    config.browserify_rails.force = true

    unless Rails.env.production?
      config.browserify_rails.paths << lambda { |p|
        p.start_with?(Rails.root.join('spec/javascripts').to_s)
      }
    end
  end
end
