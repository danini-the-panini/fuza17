10.times do |i|
  User.create(name: "test#{i}", email: "test#{i}@example.com", password: 'pass1234', password_confirmation: 'pass1234')
end
