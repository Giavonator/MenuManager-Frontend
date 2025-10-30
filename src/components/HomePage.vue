<template>
  <div class="homepage">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="title-main">Menu Manager</span>
            <span class="title-tagline">Organize. Plan. Cook. Together.</span>
          </h1>
          <p class="hero-description">
            Transform your meal planning with our comprehensive recipe management system. 
            Create, organize, and share recipes while building weekly menus that make 
            cooking a collaborative and efficient experience.
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary" @click="scrollToFeatures">
              Explore Features
            </button>
            <button class="btn btn-secondary" @click="scrollToCommunity">
              Learn More
            </button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="visual-card">
            <div class="card-icon">🍽️</div>
            <h3>Smart Planning</h3>
            <p>Intelligent menu organization</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" ref="featuresSection">
      <div class="container">
        <div class="section-header">
          <h2>Everything You Need for Perfect Meal Planning</h2>
          <p>From recipe creation to weekly cart organization, MenuManager has you covered</p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card" v-for="feature in features" :key="feature.id">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <ul class="feature-benefits">
              <li v-for="benefit in feature.benefits" :key="benefit">{{ benefit }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Community Section -->
    <section class="community" ref="communitySection">
      <div class="container">
        <div class="community-content">
          <div class="community-header">
            <div class="community-text-header">
              <h2>La Maison Française</h2>
              <p class="community-intro">
                MenuManager draws inspiration from the vibrant cooking community at MIT's French House, 
                where +30 undergraduate students live together and share their passion for French culture 
                and collaborative cooking. This unique living group has created a tight-knit community where 
                cooking becomes more than just meal preparation—it's a way to build lasting friendships, 
                experiment with new cuisines, and create a home away from home. Through their innovative 
                cookteam system and shared meal traditions, French House demonstrates how food can bring 
                people together and foster a sense of belonging that extends far beyond the kitchen.
              </p>
            </div>
            <div class="community-visual">
              <div class="visual-elements">
                <div class="element element-1">🏠</div>
                <div class="element element-2">👨‍🍳</div>
                <div class="element element-3">🍳</div>
                <div class="element element-4">🥘</div>
                <div class="element element-5">🎂</div>
                <div class="element element-6">👥</div>
              </div>
              <div class="french-house-badge">
                <div class="badge-content">
                  <span class="badge-icon">🇫🇷</span>
                  <span class="badge-text">Inspired by<br>La Maison<br>Française</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="community-content-body">
            <div class="french-house-story">
              <h3>🏠 The French House Story</h3>
              <p>
                At French House, residents cook together Sunday through Friday, with each member assigned 
                to a 5-6 person cookteam. One member "cheffs" each week, providing recipes for their team 
                to prepare during 4-7 PM cooking sessions. This creates a tight-knit community where 
                cooking becomes a way to experiment with new dishes and share tastes of home.
              </p>
              <div class="story-quote">
                <blockquote>
                  "Spending 3 hours a week cooking with other people is a great way to get to know other 
                  members of the house, and sharing a homemade meal with the rest of the house is the 
                  perfect way to end the day."
                </blockquote>
                <cite>— La Maison Française, MIT</cite>
              </div>
              
              <div class="story-quote">
                <blockquote>
                  "For many of us, French House has become a home away from home. We're a very tight-knit 
                  community and many of us have found our best friends at MIT in the house."
                </blockquote>
                <cite>— La Maison Française, MIT</cite>
              </div>
            </div>

            <div class="cooking-details">
              <h3>🍳 How French House Cooking Works</h3>
              <div class="cooking-info-grid">
                <div class="cooking-info-item">
                  <h4>📅 Schedule</h4>
                  <p>6 nights per week (every day except Saturday), dinner at 6:15pm</p>
                </div>
                <div class="cooking-info-item">
                  <h4>👥 Cookteams</h4>
                  <p>6 teams of 5-6 people each, cooking 4-7pm shifts</p>
                </div>
                <div class="cooking-info-item">
                  <h4>👨‍🍳 Chef Rotation</h4>
                  <p>Each member "chefs" twice per semester, setting the menu</p>
                </div>
                <div class="cooking-info-item">
                  <h4>💰 Cost</h4>
                  <p>Around $3-4 per person per dinner, much cheaper than meal plans</p>
                </div>
                <div class="cooking-info-item">
                  <h4>🌍 Global Cuisine</h4>
                  <p>Not just French food - we cook everything from hot pot to gyros!</p>
                </div>
                <div class="cooking-info-item">
                  <h4>🥗 Dietary Needs</h4>
                  <p>Always vegan/vegetarian options, accommodates all dietary restrictions</p>
                </div>
                <div class="cooking-info-item">
                  <h4>🎂 Special Occasions</h4>
                  <p>Birthday surprises and special meals for community members</p>
                </div>
                <div class="cooking-info-item">
                  <h4>📚 Recipe Sharing</h4>
                  <p>Collective cookbook of family recipes and cultural dishes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'HomePage',
  emits: ['navigate-to-menus'],
  setup(props, { emit }) {
    const featuresSection = ref(null)
    const communitySection = ref(null)

    const features = [
      {
        id: 1,
        icon: '📖',
        title: 'Recipe Management',
        description: 'Create, organize, and manage your personal cookbook with detailed recipes.',
        benefits: [
          'Store detailed ingredient lists',
          'Add cooking instructions',
          'Duplicate and modify recipes',
          'Organize by dish type'
        ]
      },
      {
        id: 2,
        icon: '📅',
        title: 'Menu Planning',
        description: 'Plan weekly menus with multiple recipes and automatic scaling.',
        benefits: [
          'Create menus for specific dates',
          'Scale recipes for different serving sizes',
          'Organize multiple recipes per menu',
          'Track menu ownership'
        ]
      },
      {
        id: 3,
        icon: '🛒',
        title: 'Weekly Cart Organization',
        description: 'Organize your weekly shopping with intelligent cart management.',
        benefits: [
          'Group menus by week',
          'Automatic cart creation',
          'Easy menu addition/removal',
          'Weekly planning overview'
        ]
      },
      {
        id: 4,
        icon: '🏪',
        title: 'Store Catalog Management',
        description: 'Track ingredients across stores with price comparison and optimization.',
        benefits: [
          'Compare prices across stores',
          'Track ingredient availability',
          'Optimize purchase decisions',
          'Manage purchase options'
        ]
      }
    ]

    const scrollToFeatures = () => {
      featuresSection.value?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }

    const scrollToCommunity = () => {
      communitySection.value?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }

    const handleGetStarted = () => {
      emit('navigate-to-menus')
    }

    onMounted(() => {
      // Add any initialization logic here
      console.log('HomePage mounted')
    })

    return {
      featuresSection,
      communitySection,
      features,
      scrollToFeatures,
      scrollToCommunity,
      handleGetStarted
    }
  }
}
</script>

<style scoped>
.homepage {
  min-height: 100vh;
  scroll-behavior: smooth;
}

/* Hero Section */
.hero {
  background: linear-gradient(135deg, var(--very-dark-blue) 0%, var(--light-french-blue) 50%, var(--light-french-red) 100%);
  color: var(--white);
  padding: 4rem 0 6rem;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  opacity: 0.3;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 4rem;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-title {
  margin: 0 0 1.5rem 0;
  line-height: 1.2;
}

.title-main {
  display: block;
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--white);
}

.title-tagline {
  display: block;
  font-size: 1.5rem;
  font-weight: 400;
  opacity: 0.9;
  color: var(--white);
}

.hero-description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2.5rem;
  opacity: 0.95;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.visual-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  transform: rotate(5deg);
  transition: transform 0.3s ease;
}

.visual-card:hover {
  transform: rotate(0deg) scale(1.05);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.visual-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.visual-card p {
  margin: 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

/* Features Section */
.features {
  padding: 6rem 0;
  background: var(--white);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-header h2 {
  color: var(--french-blue);
  font-size: 2.5rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.section-header p {
  color: var(--light-french-blue);
  font-size: 1.2rem;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.feature-card {
  background: var(--white);
  border: 1px solid var(--primary-light);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--french-red);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(220, 20, 60, 0.15);
  border-color: var(--french-red);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  display: block;
}

.feature-card h3 {
  color: var(--french-blue);
  font-size: 1.5rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.feature-card p {
  color: var(--light-french-blue);
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

.feature-benefits {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.feature-benefits li {
  color: var(--french-blue);
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  font-size: 0.9rem;
}

.feature-benefits li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--light-french-blue);
  font-weight: bold;
}

/* Community Section */
.community {
  padding: 6rem 0;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(255, 107, 107, 0.1) 100%);
}

.community-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.community-header {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  align-items: center;
  margin-bottom: 2rem;
}

.community-text-header {
  flex: 1;
}

.community-content-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.community-text-header {
  background: var(--white);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.community-text-header h2 {
  color: var(--french-blue);
  font-size: 2.5rem;
  margin: 0 0 1.5rem 0;
  font-weight: 600;
}

.community-intro {
  color: var(--light-french-blue);
  font-size: 1.1rem;
  line-height: 1.7;
  margin: 0 0 2rem 0;
}

.french-house-story {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  border-left: 4px solid var(--light-french-blue);
}

.french-house-story h3 {
  color: var(--french-blue);
  font-size: 1.3rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.french-house-story p {
  color: var(--light-french-blue);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

.story-quote {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border-left: 3px solid var(--french-red);
}

.story-quote blockquote {
  color: var(--light-french-red);
  font-size: 1rem;
  font-style: italic;
  line-height: 1.5;
  margin: 0 0 0.75rem 0;
  position: relative;
}

.story-quote blockquote::before {
  content: '"';
  font-size: 2rem;
  color: var(--light-french-blue);
  position: absolute;
  top: -5px;
  left: -5px;
  opacity: 0.3;
}

.story-quote cite {
  color: var(--light-french-red);
  font-size: 0.85rem;
  font-weight: 500;
  font-style: normal;
}


.cooking-details {
  background: var(--white);
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 4px 15px rgba(18, 34, 116, 0.1);
}

.cooking-details h3 {
  color: var(--french-blue);
  font-size: 1.4rem;
  margin: 0 0 1.5rem 0;
  font-weight: 600;
  text-align: center;
}

.cooking-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.cooking-info-item {
  background: var(--primary-light);
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  transition: transform 0.3s ease;
}

.cooking-info-item:hover {
  transform: translateY(-2px);
  background: var(--light-french-red);
}

.cooking-info-item:hover h4 {
  color: var(--white);
}

.cooking-info-item:hover p {
  color: var(--white);
}

.cooking-info-item h4 {
  color: var(--french-blue);
  font-size: 1rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.cooking-info-item p {
  color: var(--light-french-blue);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}


.community-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.visual-elements {
  position: relative;
  width: 350px;
  height: 350px;
}

.element {
  position: absolute;
  background: var(--white);
  border-radius: 50%;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  box-shadow: 0 5px 20px rgba(18, 34, 116, 0.1);
  animation: float 3s ease-in-out infinite;
}

.element-1 {
  top: 20px;
  left: 40px;
  animation-delay: 0s;
}

.element-2 {
  top: 80px;
  right: 30px;
  animation-delay: 0.5s;
}

.element-3 {
  top: 150px;
  left: 20px;
  animation-delay: 1s;
}

.element-4 {
  bottom: 120px;
  right: 20px;
  animation-delay: 1.5s;
}

.element-5 {
  bottom: 60px;
  left: 60px;
  animation-delay: 2s;
}

.element-6 {
  top: 200px;
  right: 80px;
  animation-delay: 2.5s;
}

.french-house-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, var(--french-red), var(--light-french-blue));
  border-radius: 50%;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 25px rgba(220, 20, 60, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

.badge-content {
  text-align: center;
  color: var(--white);
}

.badge-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.25rem;
}

.badge-text {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
  display: block;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.05); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}


/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.btn-primary {
  background: var(--light-french-blue);
  color: var(--white);
  border: 2px solid var(--light-french-blue);
}

.btn-primary:hover {
  background: var(--light-french-red);
  color: var(--white);
  border-color: var(--light-french-red);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.3);
}

.btn-secondary {
  background: var(--light-french-blue);
  color: var(--white);
  border: 2px solid var(--light-french-blue);
}

.btn-secondary:hover {
  background: var(--light-french-red);
  color: var(--white);
  border-color: var(--light-french-red);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: var(--white);
  border: 2px solid var(--light-french-blue);
}

.btn-outline:hover {
  background: var(--light-french-blue);
  color: var(--white);
  transform: translateY(-2px);
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  min-width: 160px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }

  .title-main {
    font-size: 2.5rem;
  }

  .title-tagline {
    font-size: 1.2rem;
  }

  .hero-description {
    font-size: 1.1rem;
  }

  .hero-actions {
    justify-content: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
    max-width: 100%;
  }

  .community-header {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }

  .community-content-body {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .community-text-header h2 {
    font-size: 2rem;
  }

  .french-house-story {
    padding: 1rem;
  }

  .story-quote {
    padding: 1rem;
  }

  .cooking-details {
    padding: 1.5rem;
  }

  .cooking-info-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .visual-elements {
    width: 280px;
    height: 280px;
  }

  .element {
    width: 55px;
    height: 55px;
    font-size: 1.4rem;
  }

  .french-house-badge {
    width: 100px;
    height: 100px;
  }

  .badge-icon {
    font-size: 1.5rem;
  }

  .badge-text {
    font-size: 0.6rem;
  }

  .cta-content h2 {
    font-size: 2rem;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 2rem 0 4rem;
  }

  .features, .community, .cta {
    padding: 4rem 0;
  }

  .container {
    padding: 0 1rem;
  }

  .title-main {
    font-size: 2rem;
  }

  .section-header h2 {
    font-size: 2rem;
  }

  .feature-card {
    padding: 1.5rem;
  }
}
</style>
