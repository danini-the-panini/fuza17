class Map
  def initialize(path)
    @image = ChunkyPNG::Image.from_file(path)
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
end
