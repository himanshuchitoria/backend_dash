const { ProductModel } = require("../Models/Shop.model");

const seedShopData = async () => {
  try {
    const count = await ProductModel.countDocuments();
    if (count > 0) {
      console.log("[Shop Seeder] Products already exist. Skipping seed.");
      return;
    }

    const products = [
      {
        title: "ErgoSpine Premium Lumbar Support Cushion",
        description:
          "Clinically designed for patients who experience chronic lower back pain from prolonged sitting. The ErgoSpine uses dual-density memory foam technology that contours to your spinal curve, distributing pressure evenly across the lumbar region. Recommended by orthopedic specialists for post-operative recovery, office use, and long-distance travel. Breathable 3D mesh cover prevents heat buildup and moisture retention, keeping you comfortable through extended wear.",
        price: 45.0,
        stockQty: 100,
        coverImage:
          "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&q=80",
        galleryImages: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
        ],
        category: "Orthopedic",
        features: [
          "Dual-density memory foam with orthopedic contour design",
          "Breathable 3D mesh cover — machine washable",
          "Universal strap fits any chair, car seat, or wheelchair",
          "Ergonomically certified by spine health professionals",
        ],
        averageRating: 5,
        totalReviews: 2,
        reviews: [
          {
            userName: "Dr. Patel",
            rating: 5,
            comment:
              "I recommend this to all my post-operative lumbar surgery patients. The pressure relief is exceptional and patients report measurable improvement within 2 weeks.",
            date: new Date("2024-11-12"),
          },
          {
            userName: "Ananya Sharma",
            rating: 5,
            comment:
              "After years of back pain from office work, this cushion changed my life. My posture improved significantly and the pain is nearly gone. Delivery was fast and packaging was premium.",
            date: new Date("2024-12-01"),
          },
        ],
      },
      {
        title: "MedPulse Digital Blood Pressure Monitor",
        description:
          "Hospital-grade accuracy meets home convenience. The MedPulse monitors systolic, diastolic, and pulse rate with clinically validated technology. Large backlit LCD display, irregular heartbeat detection, and 90-reading memory for both users. Comes with a wide-range cuff fitting 22–42cm arm circumference.",
        price: 89.99,
        stockQty: 50,
        coverImage:
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80",
        galleryImages: [
          "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
          "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80",
        ],
        category: "Diagnostics",
        features: [
          "Clinically validated ±2 mmHg accuracy",
          "Dual-user memory: 90 readings per user",
          "Irregular heartbeat detection alert",
          "USB-C rechargeable — no batteries needed",
        ],
        averageRating: 4.8,
        totalReviews: 1,
        reviews: [
          {
            userName: "Rajesh Kumar",
            rating: 5,
            comment:
              "Very accurate readings, confirmed by my doctor. Easy to use and the memory feature helps me track trends over time.",
            date: new Date("2025-01-15"),
          },
        ],
      },
      {
        title: "AromaMed Therapeutic Essential Oil Diffuser",
        description:
          "Combine aromatherapy with wellness. The AromaMed ultrasonic diffuser distributes therapeutic-grade essential oils in a cool mist for up to 8 hours. Seven ambient LED color modes create the perfect healing environment. Whisper-quiet operation is suitable for clinics, bedrooms, and consultation rooms.",
        price: 34.5,
        stockQty: 75,
        coverImage:
          "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
        galleryImages: [
          "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80",
        ],
        category: "Wellness",
        features: [
          "Ultrasonic cool-mist technology — preserves oil properties",
          "8-hour continuous or 16-hour intermittent mist mode",
          "7 color ambient LED modes with dim option",
          "Auto shut-off when water is empty",
        ],
        averageRating: 4.5,
        totalReviews: 1,
        reviews: [
          {
            userName: "Priya Mehta",
            rating: 4,
            comment: "Beautiful design, works perfectly. My clinic waiting room smells amazing now!",
            date: new Date("2025-02-10"),
          },
        ],
      },
    ];

    await ProductModel.insertMany(products);
    console.log(`[Shop Seeder] Successfully seeded ${products.length} products.`);
  } catch (err) {
    console.error("[Shop Seeder] Error seeding shop data:", err.message);
  }
};

module.exports = seedShopData;
