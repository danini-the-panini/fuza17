class Player < ApplicationRecord
  belongs_to :user
  belongs_to :game

  SPAWN_TIME = 5.0

  ABILITIES = [
    {
      cooldown: 0.5,
      type: 'target',
      range: 10.0,
      damage: 10.0
    },
    {
      cooldown: 0.5,
      type: 'point',
      range: 20.0,
      damage: 20.0,
      radius: 2.0
    },
    {
      cooldown: 0.5, # TODO: make this like 10s
      type: 'direction',
      range: 100.0,
      damage: 40.0
    }
  ]

  after_save :save_redis_attributes

  def save_redis_attributes
    save_state
    save_last_action
  end

  def save_state
    return unless @_retrieved_state
    REDIS.set state_key, @state.to_json
  end

  def state
    @state ||= retrieve_state
  end

  def state=(new_state)
    @_retrieved_state = true
    @state = new_state
  end

  def save_last_action
    return unless @_retrieved_last_action
    REDIS.set last_action_key, @last_action.to_json
  end

  def save_last_action_time
    return unless @_retrieved_last_action_time
    REDIS.set last_action_time_key, @last_action_time.to_f.to_json
  end

  def last_action
    @_retrieved_last_action = true
    @last_action ||= retrieve_last_action
  end

  def last_action_time
    @_retrieved_last_action_time = true
    @last_action_time ||= retrieve_last_action_time
  end

  def last_action=(new_last_action)
    @last_action = new_last_action
  end

  def last_action_time=(t)
    @last_action_time = t
  end

  private

  def state_key
    "player:#{id}:state"
  end

  def last_action_key
    "player:#{id}:last_action"
  end

  def last_action_time_key
    "player:#{id}:last_action_time"
  end

  def retrieve_state
    @_retrieved_state = true
    s = REDIS.get state_key
    return nil if s.nil?
    JSON.parse s
  end

  def retrieve_last_action
    @_retrieved_last_action = true
    s = REDIS.get last_action_key
    return nil if s.nil?
    JSON.parse s
  end

  def retrieve_last_action_time
    @_retrieved_last_action_time = true
    s = REDIS.get last_action_time_key
    return nil if s.nil?
    Time.at JSON.parse s
  end
end
