class Map
  def initialize(path)
    @image = ChunkyPNG::Image.from_file(path)
    calculate_spawn_points
  end

  def can_traverse?(x, y)
    i = (x + @image.width/2).floor
    j = (y + @image.height/2).floor
    return false unless @image.include_point?(i, j)
    color = @image[i, j]
    r = ChunkyPNG::Color.r(color)
    g = ChunkyPNG::Color.g(color)
    return false if r.zero? && g.zero?
    true
  end

  def spawn_point(team_index)
    x, y = @spawn_points[team_index].sample
    [x - @image.width/2.0, y - @image.height/2.0]
  end

  private

  def calculate_spawn_points
    @spawn_points = [[], []]
    @image.width.times do |i|
      @image.height.times do |j|
        color = @image[i, j]
        r = ChunkyPNG::Color.r(color)
        g = ChunkyPNG::Color.g(color)
        b = ChunkyPNG::Color.b(color)

        @spawn_points[0] << [i,j] if !r.zero? && g.zero? && b.zero?
        @spawn_points[1] << [i,j] if r.zero? && !g.zero? && b.zero?
      end
    end
  end
end
