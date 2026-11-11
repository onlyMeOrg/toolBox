// Measuring set v1 for the agent: easy tasks, each with a hidden check and a reference solution that
// the real compiler accepts (verify.html proves it). Never used as training data.
// kind "fn": tests are appended as a #[test] and run. kind "tile": frames are run, pixels checked.
const fn = (id, ask, tests, solution) => ({ id, kind: 'fn', ask, tests, solution });
export const TILE_HEAD = `use std::sync::Mutex;

// RGBA pixels, row by row from the top-left: 4 bytes per pixel.
static PIXELS: Mutex<Vec<u8>> = Mutex::new(Vec::new());
static SIZE: Mutex<(usize, usize)> = Mutex::new((0, 0));

/// Called once by the host.
#[unsafe(no_mangle)]
pub extern "C" fn init(width: u32, height: u32) {
    *SIZE.lock().unwrap() = (width as usize, height as usize);
    PIXELS.lock().unwrap().resize((width * height * 4) as usize, 255);
}

/// Called every frame by the host. Draws and returns the pixels.
#[unsafe(no_mangle)]
pub extern "C" fn frame(t_ms: u32) -> *const u8 {
    let (width, height) = *SIZE.lock().unwrap();
    let mut pixels = PIXELS.lock().unwrap();
    for y in 0..height {
        for x in 0..width {
            let i = (y * width + x) * 4;
`;
const TILE_TAIL = `        }
    }
    pixels.as_ptr()
}
`;
const tile = (id, ask, check, body) => ({ id, kind: 'tile', ask, check, solution: TILE_HEAD + body + TILE_TAIL });
const at = (px, w, x, y) => px.subarray((y * w + x) * 4, (y * w + x) * 4 + 4);
const is = (p, r, g, b, tol = 12) => Math.abs(p[0] - r) <= tol && Math.abs(p[1] - g) <= tol && Math.abs(p[2] - b) <= tol && p[3] === 255;

export const TASKS = [
  fn('fib', 'Write `pub fn fib(n: u32) -> u64` that returns the n-th Fibonacci number (fib(0) = 0, fib(1) = 1). It must be fast for n up to 90.',
    'assert_eq!(fib(0), 0); assert_eq!(fib(1), 1); assert_eq!(fib(10), 55); assert_eq!(fib(50), 12586269025); assert_eq!(fib(90), 2880067194370816120);',
    `pub fn fib(n: u32) -> u64 {\n    let (mut a, mut b) = (0u64, 1u64);\n    for _ in 0..n {\n        (a, b) = (b, a + b);\n    }\n    a\n}\n`),
  fn('palindrome', 'Write `pub fn is_palindrome(s: &str) -> bool` that ignores case and every character that is not a letter or a digit. An empty string is a palindrome.',
    'assert!(is_palindrome("A man, a plan, a canal: Panama")); assert!(!is_palindrome("race a car")); assert!(is_palindrome("")); assert!(is_palindrome("No lemon, no melon")); assert!(!is_palindrome("ab"));',
    `pub fn is_palindrome(s: &str) -> bool {\n    let chars: Vec<char> = s.chars().filter(|c| c.is_alphanumeric()).map(|c| c.to_ascii_lowercase()).collect();\n    chars.iter().eq(chars.iter().rev())\n}\n`),
  fn('rle', 'Write `pub fn rle(input: &str) -> String` that run-length encodes its input: each run of equal characters becomes the count followed by the character. Example: "aaabcc" becomes "3a1b2c". An empty input gives an empty string.',
    'assert_eq!(rle("aaabcc"), "3a1b2c"); assert_eq!(rle(""), ""); assert_eq!(rle("z"), "1z"); assert_eq!(rle("aabbbbbbbbbbbba"), "2a12b1a");',
    `pub fn rle(input: &str) -> String {\n    let mut out = String::new();\n    let mut chars = input.chars().peekable();\n    while let Some(c) = chars.next() {\n        let mut count = 1;\n        while chars.peek() == Some(&c) {\n            chars.next();\n            count += 1;\n        }\n        out.push_str(&count.to_string());\n        out.push(c);\n    }\n    out\n}\n`),
  fn('primes', 'Write `pub fn primes_up_to(n: u32) -> Vec<u32>` that returns every prime number less than or equal to n, in increasing order.',
    'assert_eq!(primes_up_to(1), Vec::<u32>::new()); assert_eq!(primes_up_to(2), vec![2]); assert_eq!(primes_up_to(30), vec![2,3,5,7,11,13,17,19,23,29]); assert_eq!(primes_up_to(10000).len(), 1229);',
    `pub fn primes_up_to(n: u32) -> Vec<u32> {\n    let n = n as usize;\n    let mut is_prime = vec![true; n + 1];\n    let mut primes = Vec::new();\n    for i in 2..=n {\n        if is_prime[i] {\n            primes.push(i as u32);\n            let mut j = i * i;\n            while j <= n {\n                is_prime[j] = false;\n                j += i;\n            }\n        }\n    }\n    primes\n}\n`),
  fn('wordcount', 'Write `pub fn word_count(text: &str) -> std::collections::HashMap<String, usize>` that counts how many times each word appears. Words are separated by whitespace and compared in lowercase.',
    'let m = word_count("the cat The  dog\\nthe"); assert_eq!(m.len(), 3); assert_eq!(m["the"], 3); assert_eq!(m["cat"], 1); assert_eq!(m["dog"], 1); assert!(word_count("").is_empty());',
    `use std::collections::HashMap;\n\npub fn word_count(text: &str) -> HashMap<String, usize> {\n    let mut counts = HashMap::new();\n    for word in text.split_whitespace() {\n        *counts.entry(word.to_lowercase()).or_insert(0) += 1;\n    }\n    counts\n}\n`),
  fn('gcd', 'Write `pub fn gcd(a: u64, b: u64) -> u64` that returns the greatest common divisor. gcd(0, n) is n.',
    'assert_eq!(gcd(12, 18), 6); assert_eq!(gcd(17, 5), 1); assert_eq!(gcd(0, 9), 9); assert_eq!(gcd(9, 0), 9); assert_eq!(gcd(1071, 462), 21);',
    `pub fn gcd(a: u64, b: u64) -> u64 {\n    if b == 0 { a } else { gcd(b, a % b) }\n}\n`),
  fn('lcm', 'Write `pub fn lcm(a: u64, b: u64) -> u64` that returns the least common multiple. If either number is 0 the result is 0.',
    'assert_eq!(lcm(4, 6), 12); assert_eq!(lcm(7, 3), 21); assert_eq!(lcm(0, 5), 0); assert_eq!(lcm(21, 6), 42);',
    `pub fn lcm(a: u64, b: u64) -> u64 {\n    fn gcd(a: u64, b: u64) -> u64 {\n        if b == 0 { a } else { gcd(b, a % b) }\n    }\n    if a == 0 || b == 0 { 0 } else { a / gcd(a, b) * b }\n}\n`),
  fn('reverse_words', 'Write `pub fn reverse_words(s: &str) -> String` that returns the words of s in reverse order, separated by single spaces. Words are separated by whitespace.',
    'assert_eq!(reverse_words("the quick  brown fox"), "fox brown quick the"); assert_eq!(reverse_words(""), ""); assert_eq!(reverse_words("one"), "one");',
    `pub fn reverse_words(s: &str) -> String {\n    s.split_whitespace().rev().collect::<Vec<&str>>().join(" ")\n}\n`),
  fn('anagram', 'Write `pub fn is_anagram(a: &str, b: &str) -> bool` that says whether a and b use the same letters the same number of times, ignoring case and spaces.',
    'assert!(is_anagram("Listen", "Silent")); assert!(is_anagram("a gentleman", "elegant man")); assert!(!is_anagram("abc", "abd")); assert!(!is_anagram("aab", "abb")); assert!(is_anagram("", ""));',
    `pub fn is_anagram(a: &str, b: &str) -> bool {\n    fn letters(s: &str) -> Vec<char> {\n        let mut v: Vec<char> = s.chars().filter(|c| !c.is_whitespace()).flat_map(|c| c.to_lowercase()).collect();\n        v.sort();\n        v\n    }\n    letters(a) == letters(b)\n}\n`),
  fn('sum_digits', 'Write `pub fn sum_digits(n: u64) -> u32` that returns the sum of the decimal digits of n.',
    'assert_eq!(sum_digits(0), 0); assert_eq!(sum_digits(7), 7); assert_eq!(sum_digits(12345), 15); assert_eq!(sum_digits(999999999999), 108);',
    `pub fn sum_digits(mut n: u64) -> u32 {\n    let mut sum = 0;\n    while n > 0 {\n        sum += (n % 10) as u32;\n        n /= 10;\n    }\n    sum\n}\n`),
  fn('factorial', 'Write `pub fn factorial(n: u32) -> Option<u64>` that returns n! or None when the result does not fit in a u64.',
    'assert_eq!(factorial(0), Some(1)); assert_eq!(factorial(5), Some(120)); assert_eq!(factorial(20), Some(2432902008176640000)); assert_eq!(factorial(21), None);',
    `pub fn factorial(n: u32) -> Option<u64> {\n    let mut result: u64 = 1;\n    for i in 2..=n as u64 {\n        result = result.checked_mul(i)?;\n    }\n    Some(result)\n}\n`),
  fn('fizzbuzz', 'Write `pub fn fizzbuzz(n: u32) -> Vec<String>` that returns the strings for 1 to n: "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, and the number itself otherwise.',
    'let v = fizzbuzz(15); assert_eq!(v.len(), 15); assert_eq!(v[0], "1"); assert_eq!(v[2], "Fizz"); assert_eq!(v[4], "Buzz"); assert_eq!(v[14], "FizzBuzz"); assert_eq!(v[6], "7"); assert!(fizzbuzz(0).is_empty());',
    `pub fn fizzbuzz(n: u32) -> Vec<String> {\n    (1..=n)\n        .map(|i| match (i % 3, i % 5) {\n            (0, 0) => "FizzBuzz".to_string(),\n            (0, _) => "Fizz".to_string(),\n            (_, 0) => "Buzz".to_string(),\n            _ => i.to_string(),\n        })\n        .collect()\n}\n`),
  fn('max_subarray', 'Write `pub fn max_subarray(v: &[i64]) -> i64` that returns the largest sum of a contiguous, non-empty run of elements. For an empty slice return 0.',
    'assert_eq!(max_subarray(&[-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6); assert_eq!(max_subarray(&[]), 0); assert_eq!(max_subarray(&[-3, -1, -2]), -1); assert_eq!(max_subarray(&[5]), 5);',
    `pub fn max_subarray(v: &[i64]) -> i64 {\n    let Some(&first) = v.first() else {\n        return 0;\n    };\n    let (mut best, mut current) = (first, first);\n    for &x in &v[1..] {\n        current = x.max(current + x);\n        best = best.max(current);\n    }\n    best\n}\n`),
  fn('binary_search', 'Write `pub fn find(v: &[i32], target: i32) -> Option<usize>` that returns the index of target in the sorted slice v, using binary search, or None if it is not there.',
    'let v = [1, 3, 5, 7, 9, 11]; assert_eq!(find(&v, 7), Some(3)); assert_eq!(find(&v, 1), Some(0)); assert_eq!(find(&v, 11), Some(5)); assert_eq!(find(&v, 4), None); assert_eq!(find(&[], 1), None);',
    `pub fn find(v: &[i32], target: i32) -> Option<usize> {\n    let (mut low, mut high) = (0, v.len());\n    while low < high {\n        let mid = low + (high - low) / 2;\n        if v[mid] == target {\n            return Some(mid);\n        } else if v[mid] < target {\n            low = mid + 1;\n        } else {\n            high = mid;\n        }\n    }\n    None\n}\n`),
  fn('to_binary', 'Write `pub fn to_binary(n: u32) -> String` that returns n written in base 2, without leading zeros. to_binary(0) is "0".',
    'assert_eq!(to_binary(0), "0"); assert_eq!(to_binary(1), "1"); assert_eq!(to_binary(10), "1010"); assert_eq!(to_binary(255), "11111111");',
    `pub fn to_binary(n: u32) -> String {\n    format!("{n:b}")\n}\n`),
  fn('from_roman', 'Write `pub fn from_roman(s: &str) -> Option<u32>` that converts a Roman numeral (letters I, V, X, L, C, D, M, uppercase) to a number. Return None if s is empty or has any other character.',
    'assert_eq!(from_roman("III"), Some(3)); assert_eq!(from_roman("IX"), Some(9)); assert_eq!(from_roman("MCMXCIV"), Some(1994)); assert_eq!(from_roman("XLII"), Some(42)); assert_eq!(from_roman(""), None); assert_eq!(from_roman("ABC"), None);',
    `pub fn from_roman(s: &str) -> Option<u32> {\n    if s.is_empty() {\n        return None;\n    }\n    let mut total = 0;\n    let mut previous = 0;\n    for c in s.chars().rev() {\n        let value = match c {\n            'I' => 1,\n            'V' => 5,\n            'X' => 10,\n            'L' => 50,\n            'C' => 100,\n            'D' => 500,\n            'M' => 1000,\n            _ => return None,\n        };\n        if value < previous {\n            total -= value;\n        } else {\n            total += value;\n            previous = value;\n        }\n    }\n    Some(total)\n}\n`),
  fn('caesar', 'Write `pub fn caesar(s: &str, shift: u8) -> String` that shifts each ASCII letter forward by shift positions in the alphabet, wrapping around and keeping its case. Other characters stay as they are.',
    'assert_eq!(caesar("abc", 1), "bcd"); assert_eq!(caesar("xyz", 3), "abc"); assert_eq!(caesar("Hello, World!", 13), "Uryyb, Jbeyq!"); assert_eq!(caesar("Az", 26), "Az");',
    `pub fn caesar(s: &str, shift: u8) -> String {\n    s.chars()\n        .map(|c| {\n            if c.is_ascii_alphabetic() {\n                let base = if c.is_ascii_lowercase() { b'a' } else { b'A' };\n                (base + (c as u8 - base + shift % 26) % 26) as char\n            } else {\n                c\n            }\n        })\n        .collect()\n}\n`),
  fn('dedup', 'Write `pub fn dedup(v: &[i32]) -> Vec<i32>` that removes consecutive repeated values, keeping the first of each run.',
    'assert_eq!(dedup(&[1, 1, 2, 3, 3, 3, 1]), vec![1, 2, 3, 1]); assert_eq!(dedup(&[]), Vec::<i32>::new()); assert_eq!(dedup(&[7]), vec![7]);',
    `pub fn dedup(v: &[i32]) -> Vec<i32> {\n    let mut out: Vec<i32> = Vec::new();\n    for &x in v {\n        if out.last() != Some(&x) {\n            out.push(x);\n        }\n    }\n    out\n}\n`),
  fn('merge_sorted', 'Write `pub fn merge_sorted(a: &[i32], b: &[i32]) -> Vec<i32>` that merges two sorted slices into one sorted vector.',
    'assert_eq!(merge_sorted(&[1, 4, 9], &[2, 3, 10, 11]), vec![1, 2, 3, 4, 9, 10, 11]); assert_eq!(merge_sorted(&[], &[1]), vec![1]); assert_eq!(merge_sorted(&[], &[]), Vec::<i32>::new()); assert_eq!(merge_sorted(&[2, 2], &[2]), vec![2, 2, 2]);',
    `pub fn merge_sorted(a: &[i32], b: &[i32]) -> Vec<i32> {\n    let mut out = Vec::with_capacity(a.len() + b.len());\n    let (mut i, mut j) = (0, 0);\n    while i < a.len() && j < b.len() {\n        if a[i] <= b[j] {\n            out.push(a[i]);\n            i += 1;\n        } else {\n            out.push(b[j]);\n            j += 1;\n        }\n    }\n    out.extend_from_slice(&a[i..]);\n    out.extend_from_slice(&b[j..]);\n    out\n}\n`),
  fn('capitalize', 'Write `pub fn capitalize_words(s: &str) -> String` that makes the first letter of every word uppercase and leaves the rest as it is. Words are separated by single spaces.',
    'assert_eq!(capitalize_words("hello big world"), "Hello Big World"); assert_eq!(capitalize_words(""), ""); assert_eq!(capitalize_words("a"), "A"); assert_eq!(capitalize_words("rust é legal"), "Rust É Legal");',
    `pub fn capitalize_words(s: &str) -> String {\n    s.split(' ')\n        .map(|word| {\n            let mut chars = word.chars();\n            match chars.next() {\n                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),\n                None => String::new(),\n            }\n        })\n        .collect::<Vec<String>>()\n        .join(" ")\n}\n`),
  fn('balanced', 'Write `pub fn is_balanced(s: &str) -> bool` that says whether the brackets (), [] and {} in s are correctly opened and closed. Other characters are ignored.',
    'assert!(is_balanced("{[()]}")); assert!(is_balanced("a(b)c")); assert!(!is_balanced("(]")); assert!(!is_balanced("((")); assert!(!is_balanced(")(")); assert!(is_balanced(""));',
    `pub fn is_balanced(s: &str) -> bool {\n    let mut stack = Vec::new();\n    for c in s.chars() {\n        match c {\n            '(' | '[' | '{' => stack.push(c),\n            ')' | ']' | '}' => {\n                let open = match c {\n                    ')' => '(',\n                    ']' => '[',\n                    _ => '{',\n                };\n                if stack.pop() != Some(open) {\n                    return false;\n                }\n            }\n            _ => {}\n        }\n    }\n    stack.is_empty()\n}\n`),
  fn('collatz', 'Write `pub fn collatz_steps(n: u64) -> u32` that counts the steps of the Collatz sequence from n to 1: an even number is halved, an odd number becomes 3n + 1. collatz_steps(1) is 0. n is at least 1.',
    'assert_eq!(collatz_steps(1), 0); assert_eq!(collatz_steps(2), 1); assert_eq!(collatz_steps(6), 8); assert_eq!(collatz_steps(27), 111);',
    `pub fn collatz_steps(mut n: u64) -> u32 {\n    let mut steps = 0;\n    while n != 1 {\n        n = if n % 2 == 0 { n / 2 } else { 3 * n + 1 };\n        steps += 1;\n    }\n    steps\n}\n`),
  fn('median', 'Write `pub fn median(v: &[f64]) -> Option<f64>` that returns the median of the values (the mean of the two middle ones when the count is even), or None for an empty slice. The slice is not sorted.',
    'assert_eq!(median(&[3.0, 1.0, 2.0]), Some(2.0)); assert_eq!(median(&[4.0, 1.0, 3.0, 2.0]), Some(2.5)); assert_eq!(median(&[]), None); assert_eq!(median(&[7.5]), Some(7.5));',
    `pub fn median(v: &[f64]) -> Option<f64> {\n    if v.is_empty() {\n        return None;\n    }\n    let mut sorted = v.to_vec();\n    sorted.sort_by(|a, b| a.total_cmp(b));\n    let mid = sorted.len() / 2;\n    if sorted.len() % 2 == 1 {\n        Some(sorted[mid])\n    } else {\n        Some((sorted[mid - 1] + sorted[mid]) / 2.0)\n    }\n}\n`),
  fn('transpose', 'Write `pub fn transpose(m: &[Vec<i32>]) -> Vec<Vec<i32>>` that returns the transpose of a rectangular matrix given as rows. An empty matrix gives an empty matrix.',
    'assert_eq!(transpose(&[vec![1, 2, 3], vec![4, 5, 6]]), vec![vec![1, 4], vec![2, 5], vec![3, 6]]); assert_eq!(transpose(&[]), Vec::<Vec<i32>>::new()); assert_eq!(transpose(&[vec![7]]), vec![vec![7]]);',
    `pub fn transpose(m: &[Vec<i32>]) -> Vec<Vec<i32>> {\n    let columns = m.first().map_or(0, |row| row.len());\n    (0..columns).map(|c| m.iter().map(|row| row[c]).collect()).collect()\n}\n`),
  fn('hex_to_rgb', 'Write `pub fn hex_to_rgb(s: &str) -> Option<(u8, u8, u8)>` that parses a colour written as "#rrggbb" (hexadecimal, any case). Return None for anything else.',
    'assert_eq!(hex_to_rgb("#ff8800"), Some((255, 136, 0))); assert_eq!(hex_to_rgb("#000000"), Some((0, 0, 0))); assert_eq!(hex_to_rgb("#FFFFFF"), Some((255, 255, 255))); assert_eq!(hex_to_rgb("ff8800"), None); assert_eq!(hex_to_rgb("#ff88"), None); assert_eq!(hex_to_rgb("#gg0000"), None);',
    `pub fn hex_to_rgb(s: &str) -> Option<(u8, u8, u8)> {\n    let hex = s.strip_prefix('#')?;\n    if hex.len() != 6 || !hex.is_ascii() {\n        return None;\n    }\n    let part = |i: usize| u8::from_str_radix(&hex[i..i + 2], 16).ok();\n    Some((part(0)?, part(2)?, part(4)?))\n}\n`),
  fn('leap_year', 'Write `pub fn is_leap_year(year: u32) -> bool` for the Gregorian calendar: divisible by 4, except centuries, unless divisible by 400.',
    'assert!(is_leap_year(2024)); assert!(!is_leap_year(2023)); assert!(!is_leap_year(1900)); assert!(is_leap_year(2000));',
    `pub fn is_leap_year(year: u32) -> bool {\n    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0\n}\n`),
  fn('second_largest', 'Write `pub fn second_largest(v: &[i32]) -> Option<i32>` that returns the second largest distinct value, or None if there are fewer than two distinct values.',
    'assert_eq!(second_largest(&[3, 9, 4, 9, 1]), Some(4)); assert_eq!(second_largest(&[5, 5, 5]), None); assert_eq!(second_largest(&[]), None); assert_eq!(second_largest(&[-1, -2]), Some(-2));',
    `pub fn second_largest(v: &[i32]) -> Option<i32> {\n    let largest = v.iter().copied().max()?;\n    v.iter().copied().filter(|&x| x != largest).max()\n}\n`),
  fn('rotate_left', 'Write `pub fn rotate_left(v: &[i32], k: usize) -> Vec<i32>` that returns v rotated k positions to the left. k may be larger than the length. An empty slice gives an empty vector.',
    'assert_eq!(rotate_left(&[1, 2, 3, 4, 5], 2), vec![3, 4, 5, 1, 2]); assert_eq!(rotate_left(&[1, 2, 3], 4), vec![2, 3, 1]); assert_eq!(rotate_left(&[], 3), Vec::<i32>::new()); assert_eq!(rotate_left(&[9], 0), vec![9]);',
    `pub fn rotate_left(v: &[i32], k: usize) -> Vec<i32> {\n    if v.is_empty() {\n        return Vec::new();\n    }\n    let k = k % v.len();\n    [&v[k..], &v[..k]].concat()\n}\n`),
  fn('remove_vowels', 'Write `pub fn remove_vowels(s: &str) -> String` that returns s without the vowels a, e, i, o, u in either case.',
    'assert_eq!(remove_vowels("Hello World"), "Hll Wrld"); assert_eq!(remove_vowels("AEIOUaeiou"), ""); assert_eq!(remove_vowels("rhythm"), "rhythm"); assert_eq!(remove_vowels(""), "");',
    `pub fn remove_vowels(s: &str) -> String {\n    s.chars().filter(|c| !"aeiouAEIOU".contains(*c)).collect()\n}\n`),
  fn('parse_kv', 'Write `pub fn parse_kv(s: &str) -> std::collections::HashMap<String, String>` that parses text like "a=1;b=two" into a map. Pairs are separated by ";" and each pair is "key=value". Pairs without "=" are ignored.',
    'let m = parse_kv("a=1;b=two;bad;c="); assert_eq!(m.len(), 3); assert_eq!(m["a"], "1"); assert_eq!(m["b"], "two"); assert_eq!(m["c"], ""); assert!(parse_kv("").is_empty());',
    `use std::collections::HashMap;\n\npub fn parse_kv(s: &str) -> HashMap<String, String> {\n    s.split(';')\n        .filter_map(|pair| pair.split_once('='))\n        .map(|(key, value)| (key.to_string(), value.to_string()))\n        .collect()\n}\n`),
  fn('running_sum', 'Write `pub fn running_sum(v: &[i32]) -> Vec<i32>` where element i of the result is the sum of v[0] to v[i].',
    'assert_eq!(running_sum(&[1, 2, 3, 4]), vec![1, 3, 6, 10]); assert_eq!(running_sum(&[]), Vec::<i32>::new()); assert_eq!(running_sum(&[5, -5, 5]), vec![5, 0, 5]);',
    `pub fn running_sum(v: &[i32]) -> Vec<i32> {\n    let mut total = 0;\n    v.iter()\n        .map(|&x| {\n            total += x;\n            total\n        })\n        .collect()\n}\n`),
  fn('count_char', 'Write `pub fn count_char(s: &str, c: char) -> usize` that counts how many times the character c appears in s.',
    'assert_eq!(count_char("banana", \'a\'), 3); assert_eq!(count_char("banana", \'z\'), 0); assert_eq!(count_char("", \'a\'), 0); assert_eq!(count_char("ação", \'ã\'), 1);',
    `pub fn count_char(s: &str, c: char) -> usize {\n    s.chars().filter(|&x| x == c).count()\n}\n`),

  tile('gradient', 'Write a tile program that fills the whole canvas with a horizontal gradient: black at the left edge, pure red at the right edge. Green and blue stay 0 and alpha is 255.',
    (px, w, h) => { const l = at(px, w, 0, h >> 1), r = at(px, w, w - 1, h >> 1), m = at(px, w, w >> 1, 3); return l[0] < 12 && r[0] > 243 && m[0] > 100 && m[0] < 155 && r[1] === 0 && r[2] === 0 && r[3] === 255 && l[3] === 255; },
    `            pixels[i] = (x * 255 / (width - 1)) as u8;\n            pixels[i + 1] = 0;\n            pixels[i + 2] = 0;\n            pixels[i + 3] = 255;\n`),
  tile('checker', 'Write a tile program that draws a checkerboard of 8x8 pixel squares, black and white, with a black square in the top-left corner. Alpha is 255.',
    (px, w) => { const v = (x, y) => at(px, w, x, y)[0]; return v(0, 0) < 30 && v(7, 7) < 30 && v(8, 0) > 225 && v(0, 8) > 225 && v(8, 8) < 30 && v(16, 0) < 30 && px[3] === 255; },
    `            let level = if (x / 8 + y / 8) % 2 == 0 { 0 } else { 255 };\n            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`),
  tile('solid', 'Write a tile program that fills the whole canvas with pure green (red 0, green 255, blue 0). Alpha is 255.',
    (px, w, h) => [[0, 0], [w - 1, h - 1], [w >> 1, h >> 1]].every(([x, y]) => is(at(px, w, x, y), 0, 255, 0)),
    `            pixels[i] = 0;\n            pixels[i + 1] = 255;\n            pixels[i + 2] = 0;\n            pixels[i + 3] = 255;\n`),
  tile('stripes', 'Write a tile program that draws horizontal stripes 6 pixels tall, alternating red and white, with a red stripe at the top. Alpha is 255.',
    (px, w) => is(at(px, w, 3, 0), 255, 0, 0) && is(at(px, w, 3, 5), 255, 0, 0) && is(at(px, w, 3, 6), 255, 255, 255) && is(at(px, w, 20, 11), 255, 255, 255) && is(at(px, w, 20, 12), 255, 0, 0),
    `            let red = (y / 6) % 2 == 0;\n            pixels[i] = 255;\n            pixels[i + 1] = if red { 0 } else { 255 };\n            pixels[i + 2] = if red { 0 } else { 255 };\n            pixels[i + 3] = 255;\n`),
  tile('halves', 'Write a tile program that paints the left half of the canvas blue (0, 0, 255) and the right half yellow (255, 255, 0). Alpha is 255.',
    (px, w, h) => is(at(px, w, 0, 0), 0, 0, 255) && is(at(px, w, (w >> 1) - 1, h - 1), 0, 0, 255) && is(at(px, w, w >> 1, 0), 255, 255, 0) && is(at(px, w, w - 1, h - 1), 255, 255, 0),
    `            let left = x < width / 2;\n            pixels[i] = if left { 0 } else { 255 };\n            pixels[i + 1] = if left { 0 } else { 255 };\n            pixels[i + 2] = if left { 255 } else { 0 };\n            pixels[i + 3] = 255;\n`),
  tile('border', 'Write a tile program that draws a white border 1 pixel thick around the edge of the canvas; everything inside is black. Alpha is 255.',
    (px, w, h) => is(at(px, w, 0, 0), 255, 255, 255) && is(at(px, w, w - 1, 5), 255, 255, 255) && is(at(px, w, 9, h - 1), 255, 255, 255) && is(at(px, w, 0, 20), 255, 255, 255) && is(at(px, w, 1, 1), 0, 0, 0) && is(at(px, w, w - 2, h - 2), 0, 0, 0) && is(at(px, w, w >> 1, h >> 1), 0, 0, 0),
    `            let edge = x == 0 || y == 0 || x == width - 1 || y == height - 1;\n            let level = if edge { 255 } else { 0 };\n            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`),
  tile('diagonal', 'Write a tile program that draws a white diagonal line on a black background: a pixel is white when its x equals its y. Alpha is 255.',
    (px, w) => is(at(px, w, 0, 0), 255, 255, 255) && is(at(px, w, 17, 17), 255, 255, 255) && is(at(px, w, 18, 17), 0, 0, 0) && is(at(px, w, 5, 30), 0, 0, 0),
    `            let level = if x == y { 255 } else { 0 };\n            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`),
  tile('circle', 'Write a tile program that draws a filled white circle of radius 10 centred at (width / 2, height / 2) on a black background. Alpha is 255.',
    (px, w, h) => { const cx = w >> 1, cy = h >> 1; return is(at(px, w, cx, cy), 255, 255, 255) && is(at(px, w, cx + 8, cy), 255, 255, 255) && is(at(px, w, cx, cy - 8), 255, 255, 255) && is(at(px, w, cx + 13, cy), 0, 0, 0) && is(at(px, w, cx + 9, cy + 9), 0, 0, 0) && is(at(px, w, 0, 0), 0, 0, 0); },
    `            let dx = x as i64 - (width / 2) as i64;\n            let dy = y as i64 - (height / 2) as i64;\n            let level = if dx * dx + dy * dy <= 100 { 255 } else { 0 };\n            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`),
  tile('clock', 'Write a tile program that fills the whole canvas with one shade of gray that depends on time: red, green and blue all equal t_ms modulo 256. Alpha is 255.',
    (px, w, h) => is(at(px, w, 0, 0), 33, 33, 33, 0) && is(at(px, w, w - 1, h - 1), 33, 33, 33, 0),
    `            let level = (t_ms % 256) as u8;\n            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`),
];
