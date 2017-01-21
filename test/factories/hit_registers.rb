FactoryGirl.define do
  factory :hit_register do
    game nil
    hit_player_id 1
    reporting_player_id 1
    hit_identifier "MyString"
  end
end
