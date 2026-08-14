# Proxy format converter

The proxy format converter is available in the Productivity section on `/tools/` and `/en/tools/`. Processing happens locally in the browser.

## Supported input

Enter one proxy per line. The converter recognizes:

- `host:port`
- `host:port:username:password`
- `username:password@host:port`
- `protocol://username:password@host:port`

Domains, IPv4 addresses, and bracketed IPv6 addresses are supported. Ports must be between `1` and `65535`. Blank lines are ignored; unrecognized lines are excluded from output and reported by line number.

## Output options

The output layout can be switched between:

- `host:port`
- `host:port:username:password`
- `username:password@host:port`

An optional `http://`, `https://`, or `socks5://` prefix can be added. Changes to the input, layout, or prefix regenerate the output immediately. The copy button copies the complete newline-separated result.

When an input has no credentials, credential-based layouts keep that entry as `host:port`. Selecting the `host:port` layout intentionally omits credentials and reports the number of affected entries.
