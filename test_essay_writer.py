"""
Test suite for Creative Essay Writer System

This module contains tests to validate the essay generation functionality.
"""

import unittest
from essay_writer import (
    create_essay,
    EssayWriter,
    EssayConfig,
    EssayStyle,
    ToneType,
    SentenceEnhancer,
    ParagraphGenerator
)


class TestSentenceEnhancer(unittest.TestCase):
    """Test the SentenceEnhancer class"""
    
    def test_add_descriptive_element(self):
        """Test adding descriptive elements"""
        result = SentenceEnhancer.add_descriptive_element("concept", 1.0)
        self.assertIn("concept", result)
        self.assertTrue(len(result) > len("concept"))
    
    def test_get_transition(self):
        """Test getting transition phrases"""
        transition = SentenceEnhancer.get_transition("addition")
        self.assertIsInstance(transition, str)
        self.assertTrue(len(transition) > 0)
    
    def test_add_metaphor(self):
        """Test adding metaphorical language"""
        result = SentenceEnhancer.add_metaphor("This concept")
        self.assertIn("This concept", result)
        self.assertTrue(len(result) > len("This concept"))


class TestEssayConfig(unittest.TestCase):
    """Test the EssayConfig class"""
    
    def test_default_config(self):
        """Test default configuration"""
        config = EssayConfig(topic="Test Topic")
        self.assertEqual(config.topic, "Test Topic")
        self.assertEqual(config.style, EssayStyle.CREATIVE)
        self.assertEqual(config.tone, ToneType.REFLECTIVE)
        self.assertEqual(config.min_paragraphs, 5)
        self.assertEqual(config.max_paragraphs, 8)
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = EssayConfig(
            topic="Custom Topic",
            style=EssayStyle.EXPOSITORY,
            tone=ToneType.FORMAL,
            min_paragraphs=6,
            max_paragraphs=10
        )
        self.assertEqual(config.topic, "Custom Topic")
        self.assertEqual(config.style, EssayStyle.EXPOSITORY)
        self.assertEqual(config.tone, ToneType.FORMAL)


class TestParagraphGenerator(unittest.TestCase):
    """Test the ParagraphGenerator class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = EssayConfig(topic="Test Topic")
        self.generator = ParagraphGenerator(self.config)
    
    def test_generate_introduction(self):
        """Test introduction generation"""
        intro = self.generator.generate_introduction()
        self.assertIsInstance(intro, str)
        self.assertTrue(len(intro) > 100)
        self.assertIn("Test Topic", intro)
    
    def test_generate_body_paragraph(self):
        """Test body paragraph generation"""
        body = self.generator.generate_body_paragraph("test focus", 1)
        self.assertIsInstance(body, str)
        self.assertTrue(len(body) > 50)
    
    def test_generate_conclusion(self):
        """Test conclusion generation"""
        conclusion = self.generator.generate_conclusion()
        self.assertIsInstance(conclusion, str)
        self.assertTrue(len(conclusion) > 100)
        self.assertIn("Test Topic", conclusion)


class TestEssayWriter(unittest.TestCase):
    """Test the EssayWriter class"""
    
    def test_basic_essay_generation(self):
        """Test basic essay generation"""
        config = EssayConfig(topic="Innovation")
        writer = EssayWriter(config)
        essay = writer.generate_essay()
        
        self.assertIsInstance(essay, str)
        self.assertTrue(len(essay) > 500)
        self.assertIn("Innovation", essay)
    
    def test_essay_structure(self):
        """Test essay has proper structure"""
        config = EssayConfig(topic="Technology", min_paragraphs=5, max_paragraphs=5)
        writer = EssayWriter(config)
        essay = writer.generate_essay()
        
        # Check for title
        lines = essay.split("\n")
        self.assertTrue(len(lines[0]) > 0)  # Title exists
        
        # Check essay contains key elements
        self.assertIn("Technology", essay)
    
    def test_generate_title(self):
        """Test title generation"""
        config = EssayConfig(topic="Science")
        writer = EssayWriter(config)
        title = writer._generate_title()
        
        self.assertIsInstance(title, str)
        self.assertIn("Science", title)
        self.assertTrue(len(title) > 10)
    
    def test_format_paragraph(self):
        """Test paragraph formatting"""
        config = EssayConfig(topic="Test")
        writer = EssayWriter(config)
        
        long_text = "This is a very long sentence that should be wrapped. " * 10
        formatted = writer._format_paragraph(long_text, width=80)
        
        self.assertIsInstance(formatted, str)
        lines = formatted.split("\n")
        for line in lines:
            self.assertTrue(len(line) <= 80)


class TestCreateEssayFunction(unittest.TestCase):
    """Test the create_essay convenience function"""
    
    def test_create_essay_basic(self):
        """Test basic essay creation"""
        essay = create_essay("Artificial Intelligence")
        self.assertIsInstance(essay, str)
        self.assertTrue(len(essay) > 500)
        self.assertIn("Artificial Intelligence", essay)
    
    def test_create_essay_with_style(self):
        """Test essay creation with custom style"""
        essay = create_essay(
            topic="Philosophy",
            style="expository",
            tone="analytical"
        )
        self.assertIsInstance(essay, str)
        self.assertIn("Philosophy", essay)
    
    def test_create_essay_with_paragraphs(self):
        """Test essay creation with custom paragraph count"""
        essay = create_essay(
            topic="History",
            min_paragraphs=4,
            max_paragraphs=6
        )
        self.assertIsInstance(essay, str)
        self.assertIn("History", essay)
    
    def test_different_topics(self):
        """Test essay generation with different topics"""
        topics = [
            "Climate Change",
            "Education Systems",
            "Cultural Evolution",
            "Economic Theory"
        ]
        
        for topic in topics:
            essay = create_essay(topic)
            self.assertIsInstance(essay, str)
            self.assertIn(topic, essay)
            self.assertTrue(len(essay) > 300)


class TestEssayQuality(unittest.TestCase):
    """Test the quality aspects of generated essays"""
    
    def test_essay_contains_structure(self):
        """Test that essays have proper structural elements"""
        essay = create_essay("Knowledge")
        
        # Check for reasonable length
        self.assertTrue(len(essay) > 800)
        
        # Check topic appears multiple times
        self.assertTrue(essay.count("Knowledge") >= 3)
    
    def test_essay_creativity_variation(self):
        """Test that multiple essays on same topic have variation"""
        essays = [create_essay("Creativity") for _ in range(3)]
        
        # All should be strings
        for essay in essays:
            self.assertIsInstance(essay, str)
        
        # Should have some variation (not all identical)
        self.assertFalse(all(e == essays[0] for e in essays))
    
    def test_essay_length_respects_config(self):
        """Test that paragraph count stays within bounds"""
        config = EssayConfig(
            topic="Test",
            min_paragraphs=5,
            max_paragraphs=5
        )
        writer = EssayWriter(config)
        essay = writer.generate_essay()
        
        # Count paragraphs (separated by double newlines)
        paragraphs = [p for p in essay.split("\n\n") if p.strip()]
        # Should have at least min_paragraphs (including title)
        self.assertTrue(len(paragraphs) >= config.min_paragraphs)


class TestEnumTypes(unittest.TestCase):
    """Test the enum types"""
    
    def test_essay_style_enum(self):
        """Test EssayStyle enum"""
        self.assertEqual(EssayStyle.CREATIVE.value, "creative")
        self.assertEqual(EssayStyle.EXPOSITORY.value, "expository")
        self.assertEqual(EssayStyle.DESCRIPTIVE.value, "descriptive")
    
    def test_tone_type_enum(self):
        """Test ToneType enum"""
        self.assertEqual(ToneType.REFLECTIVE.value, "reflective")
        self.assertEqual(ToneType.FORMAL.value, "formal")
        self.assertEqual(ToneType.ANALYTICAL.value, "analytical")


def run_tests():
    """Run all tests"""
    unittest.main(argv=[''], verbosity=2, exit=False)


if __name__ == "__main__":
    print("=" * 80)
    print("Running Creative Essay Writer Test Suite")
    print("=" * 80)
    print()
    
    # Run tests
    unittest.main(verbosity=2)
