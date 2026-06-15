Feature: Shady Meadows B&B API

  Background:
    * url 'https://automationintesting.online/api'

  # 1. Branding Verification
  # ● Endpoint: GET /branding/
  # ● Goal: Validate that the B&B branding information (name, contact details, and descriptions) is returning correctly.
  # ● Expectation: Verify that the name field is exactly "Shady Meadows B&B" and that the contact email matches a valid email regex

  Scenario: 1. Branding Verification
    Given path '/branding/'
    When method GET
    Then status 200
    And match response contains
      """
      {
        name: 'Shady Meadows B&B',
        contact: {
          name: '#string',
          email: '#regex .+@.+\\..+',
          phone: '#string'
        }
      }
      """

  # 2. Room Inventory
  # ● Endpoint: GET /room/
  # ● Goal: Retrieve the list of available rooms.
  # ● Expectation: Verify the response is an array and that at least one room exists with a roomPrice greater than 0.

  Scenario: 2. Room Inventory
    Given path '/room/'
    When method GET
    Then status 200
    * def rooms = response.rooms
    * match rooms == '#[]'
    * def validRoom = karate.filter(rooms, function(r) { return r.roomPrice > 0 })
    * assert validRoom.length > 0

  # 3. Booking Creation
  # ● Endpoint: POST /booking/
  # ● Goal: Create a new booking for a room.
  # ● Requirement: * Find a valid roomid first.
  #   ○ Payload must include firstname, lastname, depositpaid (boolean), and a bookingdates object.
  #   ○ Note: This endpoint often requires specific headers (e.g., Content-Type: application/json).

  Scenario: 3. Booking Creation
    * def checkin = java.time.LocalDate.now().plusDays(1).toString()
    * def checkout = java.time.LocalDate.now().plusDays(2).toString()
    Given path '/room'
    And param checkin = checkin
    And param checkout = checkout
    When method GET
    Then status 200
    * def rooms = response.rooms
    * def validRoom = karate.filter(rooms, function(r) { return r.roomPrice > 0 })
    * assert validRoom.length > 0
    * def roomId = validRoom[0].roomid
    Given path '/booking/'
    And header Content-Type = 'application/json'
    And request
      """
      {
        'roomid': #(roomId),
        'firstname': 'Marcos',
        'lastname': 'Melo',
        'depositpaid': false,
        'bookingdates': {
          'checkin': '#(checkin)',
          'checkout': '#(checkout)'
        },
        'email': 'marcos.vinithius@gmail.com',
        'phone': '123123123123'
      }
      """
    When method POST
    Then status 201
    * def bookingId = response.bookingid
    And match response contains
      """
      {
        'bookingdates': {
          'checkin': '#(checkin)',
          'checkout': '#(checkout)'
        },
        'bookingid': #number,
        'depositpaid': false,
        'firstname': 'Marcos',
        'lastname': 'Melo',
        'roomid': #(roomId)
      }
      """
    # For further testing and to avoid having to scroll through dates, I decided to use this 
    # authentication method and delete the booking I made during the test. This way, I can test 
    # many times without receiving a 409 Conflict error. If you want data in the database, comment
    # out or remove the script below.
    Given path '/auth/login'
    And request { username: 'admin', password: 'password' }
    When method POST
    Then status 200
    * def token = response.token
    Given path '/booking/' + bookingId
    And cookie token = token
    When method DELETE
    Then status 202

