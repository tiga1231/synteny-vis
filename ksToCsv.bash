if [[ -z "$3" ]] ; then
    echo "give a filename and two length files"
    exit 1
fi

cat "$1" \
    | tr $'\t' ',' \
    | sed 's/||/|/g' \
    | tr '|' ',' \
    | sed 's/ //' \
    | python3 ./simplify/inline_offsets.py "$2" "$3" \
    | python3 ./simplify/remove_duplicates.py

