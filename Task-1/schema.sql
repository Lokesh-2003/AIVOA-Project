-- Create the database
CREATE DATABASE IF NOT EXISTS crm_hcp_module;
USE crm_hcp_module;

-- Interactions Table
CREATE TABLE interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hcp_name VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) DEFAULT 'Meeting',
    interaction_date DATE,
    interaction_time TIME,
    attendees TEXT, -- Stored as JSON string or comma-separated
    topics_discussed TEXT,
    materials_shared TEXT, -- Stored as JSON string
    sentiment ENUM('Positive', 'Neutral', 'Negative') DEFAULT 'Neutral',
    outcomes TEXT,
    follow_up_actions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample Data (Optional)
INSERT INTO interactions (hcp_name, interaction_type, sentiment) 
VALUES ('Dr. Sarah Smith', 'Meeting', 'Positive');