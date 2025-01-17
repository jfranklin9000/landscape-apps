|*  [key=mold val=mold]
=>  |%
    +$  item  [key=key val=val]
    --
~%  %mope-comp  ..zuse  ~
|=  compare=$-([key key] ?)
~%  %mope-core  ..zuse  ~
|%
::  +bat: tabulate a subset excluding start element with a max count (backwards)
::
++  bat
  |=  [a=(tree item) b=(unit key) c=@]
  ^-  (list item)
  |^
  e:(tabulate (del-span a b) b c)
  ::
  ++  tabulate
    |=  [a=(tree item) b=(unit key) c=@]
    ^-  [d=@ e=(list item)]
    ?:  ?&(?=(~ b) =(c 0))
      [0 ~]
    =|  f=[d=@ e=(list item)]
    |-  ^+  f
    ?:  ?|(?=(~ a) =(d.f c))  f
    =.  f  $(a r.a)
    ?:  =(d.f c)  f
    =.  f  [+(d.f) [n.a e.f]]
    ?:(=(d.f c) f $(a l.a))
  ::
  ++  del-span
    |=  [a=(tree item) b=(unit key)]
    ^-  (tree item)
    ?~  a  a
    ?~  b  a
    ?:  =(key.n.a u.b)
      l.a
    ?.  (compare key.n.a u.b)
      $(a l.a)
    a(r $(a r.a))
  --
::  +bot: produce the N leftmost elements
::
++  bot
  |=  [a=(tree item) b=@]
  ^-  (list item)
  |^  p:(items-with-remainder a b)
  ++  items-with-remainder
    |=  [a=(tree item) b=@]
    ^-  (pair (list item) @)
    ?~  a  [~ b]
    ?:  =(b 0)  [~ 0]
    =/  left-result  (items-with-remainder l.a b)
    ?:  =(q.left-result 0)  left-result
    ?:  =(q.left-result 1)  [(zing ~[p.left-result ~[n.a]]) (dec q.left-result)]
    =/  right-result
      (items-with-remainder r.a (dec q.left-result))
    [(zing ~[p.left-result ~[n.a] p.right-result]) q.right-result]
  --
::  +top: produce the N rightmost elements
::
++  top
  |=  [a=(tree item) b=@]
  ^-  (list item)
  |^  p:(items-with-remainder a b)
  ++  items-with-remainder
    |=  [a=(tree item) b=@]
    ^-  (pair (list item) @)
    ?~  a  [~ b]
    ?:  =(b 0)  [~ 0]
    =/  right-result  (items-with-remainder r.a b)
    ?:  =(q.right-result 0)  right-result
    ?:  =(q.right-result 1)  [[n.a p.right-result] (dec q.right-result)]
    =/  left-result
      (items-with-remainder l.a (dec q.right-result))
    [(zing ~[p.left-result ~[n.a] p.right-result]) q.left-result]
  --
--
