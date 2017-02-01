if Rails.env.production?
  REDIS = Redis.new(url: ENV['REDIS_URL'])
else
  REDIS = Redis.new(host: '127.0.0.1', port: 6379, db: 3)
end
