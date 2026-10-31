// Used to seed and for demo without DB dependency - also mirrored via API
export const mockProjects = [
  { key: "BET", name: "Betaray Platform", description: "E-commerce checkout & payments", template: "Scrum" },
  { key: "PAY", name: "Payments Service", description: "PCI compliant payment microservice", template: "Kanban" },
  { key: "MOB", name: "Mobile App", description: "iOS/Android banking app", template: "Scrum" },
]

export const mockIssues = [
  { key: "BET-101", summary: "As a user I can add items to cart", type: "Story", status: "In Progress", priority: "High" },
  { key: "BET-102", summary: "Payment fails with 3DS enabled cards", type: "Bug", status: "To Do", priority: "Highest" },
  { key: "BET-103", summary: "Checkout requires address validation", type: "Story", status: "Done", priority: "Medium" },
  { key: "BET-104", summary: "Implement Apple Pay checkout", type: "Story", status: "To Do", priority: "High" },
  { key: "BET-105", summary: "Order confirmation email not sent", type: "Bug", status: "In Progress", priority: "Medium" },
]

export const mockTestsSeed = [
  { key: "BET-201", summary: "Verify add to cart with valid SKU", type: "Manual", priority: "High", status: "To Do", steps: [{ action: "Navigate to product page", expected: "Product loads" }, { action: "Click Add to Cart", expected: "Cart badge increments" }, { action: "Open cart drawer", expected: "Item visible with correct quantity" }] },
  { key: "BET-202", summary: "Checkout address validation - valid postcode", type: "Manual", priority: "Medium", status: "To Do", steps: [{ action: "Enter valid postcode NW1 6XE", expected: "Address auto-completes" }, { action: "Submit checkout", expected: "Order placed" }] },
  { key: "BET-203", summary: "3DS payment flow", type: "Cucumber", priority: "Highest", status: "To Do", gherkin: "Feature: 3DS Payment\n  Scenario: Successful 3DS challenge\n    Given user has items in cart\n    When they pay with 3DS card 4000000000003220\n    Then 3DS challenge appears\n    And after completing challenge order is confirmed" },
  { key: "BET-204", summary: "Apple Pay checkout", type: "Manual", priority: "High", status: "To Do", steps: [{ action: "Tap Apple Pay button", expected: "Apple Pay sheet opens" }] },
  { key: "BET-205", summary: "Order email delivery", type: "Generic", priority: "Medium", status: "To Do" },
  { key: "BET-206", summary: "Cart persistence across sessions", type: "Manual", priority: "Low", status: "To Do", steps: [{ action: "Add item, logout, login", expected: "Cart retained" }] },
  { key: "BET-207", summary: "Payment retry on network failure", type: "Manual", priority: "High", status: "To Do", steps: [{ action: "Simulate offline during pay", expected: "Retry prompt shown" }] },
]

export const mockEnvironments = ["Staging", "Production", "QA", "Dev"]
