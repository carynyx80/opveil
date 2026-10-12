// Curated, high-confidence selector -> signature map for common standards.
// Only well-known 4-byte selectors are listed; anything else is "unknown"
// unless resolved via an external signature database (marked low confidence).

export const KNOWN_SELECTORS: Record<string, string[]> = {
  "06fdde03": ["name()"],
  "095ea7b3": ["approve(address,uint256)"],
  "150b7a02": ["onERC721Received(address,address,uint256,bytes)"],
  "18160ddd": ["totalSupply()"],
  "23b872dd": ["transferFrom(address,address,uint256)"],
  "252dba42": ["symbol()"],
  "313ce567": ["decimals()"],
  "39509351": ["increaseAllowance(address,uint256)"],
  "40c10f19": ["mint(address,uint256)"],
  "42966c68": ["burn(uint256)"],
  "54fd4d50": ["version()"],
  "5c60da1b": ["implementation()"],
  "6352211e": ["owner()"],
  "70a08231": ["balanceOf(address)"],
  "715018a6": ["renounceOwnership()"],
  "79cc6790": ["implementation()"],
  "8129fc1c": ["allowance(address,address)"],
  "8456cb59": ["pause()"],
  "8da5cb5b": ["owner()"],
  "a9059cbb": ["transfer(address,uint256)"],
  "b6b55f25": ["deposit()"],
  "c87b56dd": ["tokenURI(uint256)"],
  "d4b83992": ["admin()"],
  "dd62ed3e": ["allowance(address,address)"],
  "f2fde38b": ["transferOwnership(address)"],
  "fbdaef7b": ["proxiableUUID()"],
  "3659cfe6": ["upgradeTo(address)"],
  "4f1ef286": ["upgradeToAndCall(address,bytes)"],
  "8f283970": ["changeAdmin(address)"],
  "f8a8fd6d": ["mint(uint256)"],
  "a217fddf": ["revert()"],
};

export function lookupKnownSelector(selectorHex: string): string[] {
  const s = selectorHex.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{8}$/.test(s)) return [];
  return KNOWN_SELECTORS[s] ?? [];
}
