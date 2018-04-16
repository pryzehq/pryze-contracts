module.exports = {
  expectThrow: async promise => {
    try {
      await promise
    } catch (error) {
      const invalidJump = error.message.search('invalid JUMP') >= 0
      const invalidOpcode = error.message.search('invalid opcode') >= 0
      const outOfGas = error.message.search('out of gas') >= 0
      const vmException = error.message.search('VM Exception while processing transaction') >= 0
      assert(invalidJump || invalidOpcode || outOfGas || vmException, "Expected throw, got '" + error + "' instead")
      return
    }
    assert.fail('Expected throw not received')
  }
}
