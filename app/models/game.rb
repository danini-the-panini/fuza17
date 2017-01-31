class Game < ApplicationRecord
  MONUMENT_HP = 1000.0

  belongs_to :user
  has_many :players, dependent: :destroy

  enum status: [:in_progress, :over ]

  validates :name, presence: true, uniqueness: true

  def self.default_state
    {
      monument_hps: [MONUMENT_HP, MONUMENT_HP]
    }
  end

  def save_redis_attributes
    save_state
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

  def find_hit(hit_id)
    s = REDIS.get "hit:#{hit_id}"
    return nil if s.nil?
    JSON.parse s
  end

  def create_hit(hit_id, data)
    REDIS.set "hit:#{hit_id}", data.to_json
  end

  def destroy_hit(hit_id)
    REDIS.del "hit:#{hit_id}"
  end

  private

  def state_key
    "game:#{id}:state"
  end

  def retrieve_state
    @_retrieved_state = true
    s = REDIS.get state_key
    return nil if s.nil?
    JSON.parse s
  end
end
